import { ingredients as allIngredients, products } from './data'
import type { EffectSet } from './effectSet'
import { MAX_EFFECTS } from './mix'
import { askingPrice } from './price'

/*
 * One search engine answers every "how do I make..." question. A question is a Query: where to
 * start, which ingredients are allowed, which effects the result must (not) have, how to rank
 * recipes, and limits on mixes and cost.
 *
 * It's a uniform-cost search over (start, effect set, mixes so far). A state is skipped when an
 * already-expanded state with the same effects is at least as good on both cost and mixes, so
 * results are exact even with a mix limit. There are millions of reachable effect sets, so the
 * state is stored in typed arrays rather than objects and Maps.
 */

export interface Start {
  product: number
  effects: EffectSet
}

export type Ranking = 'cost' | 'mixes' | 'profit'

export interface Query {
  starts: Start[]
  /** Indices of the ingredients that may be used. */
  ingredients: number[]
  include: EffectSet
  exclude: EffectSet
  /** Require exactly the `include` effects rather than at least them. */
  exact: boolean
  ranking: Ranking
  maxMixes: number
  maxCost?: number
  /** How many results to return. */
  limit: number
  /** Give up after expanding this many states. */
  maxStates?: number
}

export interface Result {
  /** Products this recipe applies to (products with identical starting effects share recipes). */
  products: number[]
  start: EffectSet
  effects: EffectSet
  /** Ingredient indices, in mixing order. */
  recipe: number[]
  cost: number
  mixes: number
}

export interface Outcome {
  results: Result[]
  statesExpanded: number
  /**
   * 'limit': found `limit` results and stopped early.
   * 'exhausted': checked every possibility within the limits, so the results are complete.
   * 'budget': hit `maxStates` first, so better or further results may exist.
   */
  stoppedBy: 'limit' | 'exhausted' | 'budget'
}

const TWO_32 = 2 ** 32
const DEFAULT_MAX_STATES = 20_000_000

function popcount32(n: number): number {
  n = n - ((n >>> 1) & 0x55555555)
  n = (n & 0x33333333) + ((n >>> 2) & 0x33333333)
  return (((n + (n >>> 4)) & 0x0f0f0f0f) * 0x01010101) >>> 24
}

/**
 * An ingredient compiled to bit operations on a set split into two 32-bit words. Each rule is
 * 4 numbers: fromWord (0 low, 1 high), fromMask, toWord, toMask. Mirrors `mix` in mix.ts.
 */
export class CompiledIngredient {
  readonly rules: Int32Array
  readonly baseWord: number
  readonly baseMask: number
  readonly price: number
  readonly index: number

  constructor(index: number) {
    this.index = index
    const ingredient = allIngredients[index]
    this.price = ingredient.price
    this.rules = new Int32Array(ingredient.transformations.flatMap(([from, to]) => [from >> 5, 1 << (from & 31), to >> 5, 1 << (to & 31)]))
    this.baseWord = ingredient.baseEffect >> 5
    this.baseMask = 1 << (ingredient.baseEffect & 31)
  }

  /** Mixes into the set (lo, hi); the result is left in `out`. */
  mix(lo: number, hi: number, out: { lo: number; hi: number }) {
    let rlo = lo, rhi = hi
    const rules = this.rules
    for (let k = 0; k < rules.length; k += 4) {
      const fromMask = rules[k + 1], toMask = rules[k + 3]
      if (((rules[k] ? hi : lo) & fromMask) === 0) continue
      if (((rules[k + 2] ? rhi : rlo) & toMask) !== 0) continue
      if (rules[k]) rhi &= ~fromMask
      else rlo &= ~fromMask
      if (rules[k + 2]) rhi |= toMask
      else rlo |= toMask
    }
    if (((this.baseWord ? rhi : rlo) & this.baseMask) === 0 && popcount32(rlo) + popcount32(rhi) < MAX_EFFECTS) {
      if (this.baseWord) rhi |= this.baseMask
      else rlo |= this.baseMask
    }
    out.lo = rlo >>> 0
    out.hi = rhi >>> 0
  }
}

/** Open-addressing hash table from non-negative integer keys (< 2^53) to slots with int columns. */
class Table {
  keys: Float64Array
  used: Uint8Array
  columns: Int32Array[]
  size = 0
  private mask: number
  private columnCount: number

  constructor(columnCount: number, capacity = 1 << 16) {
    this.columnCount = columnCount
    this.keys = new Float64Array(capacity)
    this.used = new Uint8Array(capacity)
    this.columns = Array.from({ length: columnCount }, () => new Int32Array(capacity))
    this.mask = capacity - 1
  }

  private hash(key: number): number {
    const lo = key % TWO_32, hi = Math.floor(key / TWO_32)
    return Math.imul(lo ^ Math.imul(hi, 0x9e3779b1), 0x85ebca6b) ^ (lo >>> 15)
  }

  /** The key's slot, or -1. */
  find(key: number): number {
    for (let slot = this.hash(key) & this.mask; ; slot = (slot + 1) & this.mask) {
      if (!this.used[slot]) return -1
      if (this.keys[slot] === key) return slot
    }
  }

  /** The key's slot, inserting it with every column set to `initial` if absent. */
  findOrInsert(key: number, initial: number): number {
    if (this.size * 2 >= this.keys.length) this.grow()
    let slot = this.hash(key) & this.mask
    for (; this.used[slot]; slot = (slot + 1) & this.mask) {
      if (this.keys[slot] === key) return slot
    }
    this.used[slot] = 1
    this.keys[slot] = key
    for (const column of this.columns) column[slot] = initial
    this.size++
    return slot
  }

  private grow() {
    const { keys, used, columns } = this
    const capacity = keys.length * 2
    this.keys = new Float64Array(capacity)
    this.used = new Uint8Array(capacity)
    this.columns = Array.from({ length: this.columnCount }, () => new Int32Array(capacity))
    this.mask = capacity - 1
    for (let old = 0; old < keys.length; old++) {
      if (!used[old]) continue
      let slot = this.hash(keys[old]) & this.mask
      while (this.used[slot]) slot = (slot + 1) & this.mask
      this.used[slot] = 1
      this.keys[slot] = keys[old]
      for (let c = 0; c < columns.length; c++) this.columns[c][slot] = columns[c][old]
    }
  }
}

/** Search states, stored column-wise. */
class States {
  lo = new Int32Array(1 << 16)
  /** (start group × 8) + high word of the effect set. */
  hi = new Int32Array(1 << 16)
  cost = new Int32Array(1 << 16)
  mixes = new Uint8Array(1 << 16)
  parent = new Int32Array(1 << 16)
  ingredient = new Uint8Array(1 << 16)
  count = 0

  add(lo: number, hi: number, cost: number, mixes: number, parent: number, ingredient: number): number {
    if (this.count === this.lo.length) {
      const grow = <T extends Int32Array | Uint8Array>(a: T): T => {
        const b = new (a.constructor as new (n: number) => T)(a.length * 2)
        b.set(a)
        return b
      }
      this.lo = grow(this.lo)
      this.hi = grow(this.hi)
      this.cost = grow(this.cost)
      this.mixes = grow(this.mixes)
      this.parent = grow(this.parent)
      this.ingredient = grow(this.ingredient)
    }
    const i = this.count++
    this.lo[i] = lo
    this.hi[i] = hi
    this.cost[i] = cost
    this.mixes[i] = mixes
    this.parent[i] = parent
    this.ingredient[i] = ingredient
    return i
  }
}

/** Priorities only ever increase, so a bucket per priority makes a fast queue. */
class BucketQueue {
  private buckets: number[][] = []
  private current = 0

  push(priority: number, item: number) {
    ;(this.buckets[priority] ??= []).push(item)
  }

  /** The next item, or -1 when empty. */
  pop(): number {
    for (; this.current < this.buckets.length; this.current++) {
      const bucket = this.buckets[this.current]
      if (bucket && bucket.length > 0) return bucket.pop()!
    }
    return -1
  }
}

export function search(query: Query, onProgress?: (statesExpanded: number) => void): Outcome {
  const ingredients = query.ingredients.map(i => new CompiledIngredient(i))
  const maxCost = query.maxCost ?? Infinity
  const maxStates = query.maxStates ?? DEFAULT_MAX_STATES
  const byCost = query.ranking !== 'mixes'
  const priority = (cost: number, mixes: number) => (byCost ? cost * 64 + mixes : mixes * 4096 + cost)

  // Products with the same starting effects explore identically, so they share a group.
  const groups: { effects: EffectSet; products: number[] }[] = []
  for (const start of query.starts) {
    const group = groups.find(g => g.effects === start.effects)
    if (group) group.products.push(start.product)
    else groups.push({ effects: start.effects, products: [start.product] })
  }

  // An exact match is one particular set, so there's at most one result per group.
  const limit = query.exact ? Math.min(query.limit, groups.length) : query.limit

  const incLo = query.include % TWO_32 | 0, incHi = Math.floor(query.include / TWO_32) | 0
  const excLo = query.exclude % TWO_32 | 0, excHi = Math.floor(query.exclude / TWO_32) | 0
  const matches = (lo: number, hi: number) =>
    query.exact
      ? (lo | 0) === incLo && (hi | 0) === incHi
      : (lo & incLo) === incLo && (hi & incHi) === incHi && (lo & excLo) === 0 && (hi & excHi) === 0

  const states = new States()
  // Best queued state for each (group, effects, mixes): column 0 = state index.
  const queued = new Table(1)
  // Per (group, effects): column 0 = fewest mixes expanded, 1 = lowest cost expanded, 2 = reported.
  const expanded = new Table(3)
  const queue = new BucketQueue()
  const stateKey = (hi: number, mixes: number, lo: number) => (hi * 16 + mixes) * TWO_32 + lo
  const setKey = (hi: number, lo: number) => hi * TWO_32 + lo

  groups.forEach((group, g) => {
    const lo = group.effects % TWO_32, hi = g * 8 + Math.floor(group.effects / TWO_32)
    const s = states.add(lo, hi, 0, 0, -1, 0)
    queued.columns[0][queued.findOrInsert(stateKey(hi, 0, lo), s)] = s
    queue.push(0, s)
  })

  const found: number[] = []
  const out = { lo: 0, hi: 0 }
  let statesExpanded = 0
  let stoppedBy: Outcome['stoppedBy'] = 'exhausted'

  for (let s = queue.pop(); s >= 0; s = queue.pop()) {
    const lo = states.lo[s] >>> 0, hi = states.hi[s], cost = states.cost[s], mixes = states.mixes[s]
    if (queued.columns[0][queued.find(stateKey(hi, mixes, lo))] !== s) continue // superseded

    // Skip if an expanded state with these effects is at least as good. States leave the queue
    // in priority order, so earlier ones are already no worse on the ranking's main measure.
    const slot = expanded.findOrInsert(setKey(hi, lo), 0x7fffffff)
    const [fewestMixes, lowestCost, reported] = expanded.columns
    if (byCost ? fewestMixes[slot] <= mixes : lowestCost[slot] <= cost) continue
    fewestMixes[slot] = Math.min(fewestMixes[slot], mixes)
    lowestCost[slot] = Math.min(lowestCost[slot], cost)

    if (++statesExpanded % 100_000 === 0) onProgress?.(statesExpanded)
    if (statesExpanded > maxStates) {
      stoppedBy = 'budget'
      break
    }

    // The first time a set is expanded is its best recipe for this ranking.
    if (reported[slot] === 0x7fffffff) {
      reported[slot] = 1
      if (matches(lo, hi & 7)) {
        found.push(s)
        if (query.ranking !== 'profit' && found.length >= limit) {
          stoppedBy = 'limit'
          break
        }
      }
    }

    if (mixes >= query.maxMixes) continue
    const group = hi & ~7
    for (let i = 0; i < ingredients.length; i++) {
      const ingredient = ingredients[i]
      const nextCost = cost + ingredient.price
      if (nextCost > maxCost) continue
      ingredient.mix(lo, hi & 7, out)
      const nextHi = group | out.hi, nextMixes = mixes + 1

      const done = expanded.find(setKey(nextHi, out.lo))
      if (done >= 0 && (byCost ? expanded.columns[0][done] <= nextMixes : expanded.columns[1][done] <= nextCost)) continue

      const q = queued.findOrInsert(stateKey(nextHi, nextMixes, out.lo), -1)
      const existing = queued.columns[0][q]
      if (existing >= 0 && states.cost[existing] <= nextCost) continue
      const next = states.add(out.lo, nextHi, nextCost, nextMixes, s, i)
      queued.columns[0][q] = next
      queue.push(priority(nextCost, nextMixes), next)
    }
  }

  const toResult = (s: number, products: number[]): Result => {
    const recipe: number[] = []
    for (let n = s; states.parent[n] >= 0; n = states.parent[n]) recipe.push(ingredients[states.ingredient[n]].index)
    recipe.reverse()
    const group = groups[states.hi[s] >> 3]
    return {
      products,
      start: group.effects,
      effects: (states.hi[s] & 7) * TWO_32 + (states.lo[s] >>> 0),
      recipe,
      cost: states.cost[s],
      mixes: states.mixes[s],
    }
  }

  if (query.ranking !== 'profit') {
    return { results: found.map(s => toResult(s, groups[states.hi[s] >> 3].products)), statesExpanded, stoppedBy }
  }

  // Each set's cheapest recipe is its most profitable; rank every product separately.
  const candidates: { s: number; product: number; profit: number }[] = []
  for (const s of found) {
    const effects = (states.hi[s] & 7) * TWO_32 + (states.lo[s] >>> 0)
    for (const product of groups[states.hi[s] >> 3].products) {
      candidates.push({ s, product, profit: askingPrice(products[product], effects) - states.cost[s] })
    }
  }
  candidates.sort((a, b) => b.profit - a.profit || states.cost[a.s] - states.cost[b.s] || states.mixes[a.s] - states.mixes[b.s])
  return {
    results: candidates.slice(0, query.limit).map(c => toResult(c.s, [c.product])),
    statesExpanded,
    stoppedBy: stoppedBy === 'limit' ? 'exhausted' : stoppedBy,
  }
}
