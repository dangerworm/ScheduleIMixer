import { describe, expect, it } from 'vitest'
import strategies from '@data/max-profit-strategies.json'
import { customers, ingredientByName, ingredients, productByName, products } from './data'
import { favouriteWeights, matchCount, standardsRange } from './customers'
import { EMPTY, fromNames, toEffects, type EffectSet } from './effectSet'
import { mix, mixSteps, startingEffects } from './mix'
import { askingPrice, recipeCost } from './price'
import { CompiledIngredient, search, type Query, type Result } from './search'

const all = ingredients.map(i => i.index)
const startOf = (name: string) => {
  const product = productByName(name)
  return { product: product.index, effects: startingEffects(product) }
}
const query = (q: Partial<Query>): Query => ({
  starts: [startOf('OG Kush')],
  ingredients: all,
  include: EMPTY,
  exclude: EMPTY,
  exact: false,
  ranking: 'cost',
  maxMixes: 8,
  limit: 10,
  ...q,
})

/** Every result's recipe must reproduce its effects and cost. */
function expectValid(results: Result[]) {
  for (const r of results) {
    const recipe = r.recipe.map(i => ingredients[i])
    let set = r.start
    for (const i of recipe) set = mix(set, i)
    expect(set).toBe(r.effects)
    expect(recipeCost(recipe)).toBe(r.cost)
    expect(recipe.length).toBe(r.mixes)
  }
}

/** Best [cost, mixes] (or [mixes, cost]) for every set reachable within maxMixes, by trying every recipe. */
function bruteForce(start: EffectSet, allowed: number[], maxMixes: number, byCost: boolean): Map<EffectSet, [number, number]> {
  const best = new Map<EffectSet, [number, number]>()
  const better = (a: [number, number], b: [number, number]) => (byCost ? a[0] < b[0] || (a[0] === b[0] && a[1] < b[1]) : a[1] < b[1] || (a[1] === b[1] && a[0] < b[0]))
  const visit = (set: EffectSet, cost: number, mixes: number) => {
    const current = best.get(set)
    if (!current || better([cost, mixes], current)) best.set(set, [cost, mixes])
    if (mixes === maxMixes) return
    for (const i of allowed) visit(mix(set, ingredients[i]), cost + ingredients[i].price, mixes + 1)
  }
  visit(start, 0, 0)
  return best
}

describe('compiled ingredients mix the same as mix()', () => {
  it('for random recipes', () => {
    const compiled = ingredients.map(i => new CompiledIngredient(i.index))
    const out = { lo: 0, hi: 0 }
    let seed = 1
    const random = () => (seed = (seed * 16807) % 2147483647) / 2147483647
    for (let trial = 0; trial < 2000; trial++) {
      let set = startingEffects(products[Math.floor(random() * products.length)])
      for (let step = 0; step < 12; step++) {
        const i = Math.floor(random() * ingredients.length)
        compiled[i].mix(set % 2 ** 32, Math.floor(set / 2 ** 32), out)
        set = mix(set, ingredients[i])
        expect(out.hi * 2 ** 32 + out.lo).toBe(set)
      }
    }
  })
})

describe('search agrees with brute force', () => {
  const cases = [
    { name: 'OG Kush, all ingredients, 3 mixes', start: 'OG Kush', allowed: all, maxMixes: 3 },
    { name: 'Meth, 6 ingredients, 5 mixes', start: 'Methamphetamine', allowed: ['Cuke', 'Banana', 'Gasoline', 'Mega Bean', 'Battery', 'Viagor'].map(n => ingredientByName(n).index), maxMixes: 5 },
  ]
  for (const c of cases) {
    for (const ranking of ['cost', 'mixes'] as const) {
      it(`${c.name}, by ${ranking}`, () => {
        const start = startOf(c.start)
        const expected = bruteForce(start.effects, c.allowed, c.maxMixes, ranking === 'cost')
        const outcome = search(query({ starts: [start], ingredients: c.allowed, ranking, maxMixes: c.maxMixes, limit: Infinity }))
        expect(outcome.stoppedBy).toBe('exhausted')
        expectValid(outcome.results)
        const actual = new Map(outcome.results.map(r => [r.effects, [r.cost, r.mixes]]))
        expect(actual).toEqual(expected)
      })
    }
  }
})

describe('search', () => {
  it('returns results best-first and stops at the limit', () => {
    const include = fromNames(['Glowing', 'Zombifying'])
    const outcome = search(query({ starts: [startOf('Methamphetamine')], include, limit: 5 }))
    expect(outcome.stoppedBy).toBe('limit')
    expect(outcome.results).toHaveLength(5)
    expectValid(outcome.results)
    const costs = outcome.results.map(r => r.cost)
    expect(costs).toEqual([...costs].sort((a, b) => a - b))
  })

  it('respects excluded effects, exact matches and the cost limit', () => {
    const include = fromNames(['Anti-Gravity'])
    const exclude = fromNames(['Balding'])
    const excluded = search(query({ include, exclude, maxCost: 20, limit: 20 }))
    expectValid(excluded.results)
    for (const r of excluded.results) {
      expect(r.cost).toBeLessThanOrEqual(20)
      expect(r.effects % 2 ** 32 & (exclude % 2 ** 32)).toBe(0)
    }

    const exact = search(query({ include: fromNames(['Anti-Gravity', 'Balding']), exact: true, limit: 3 }))
    expect(exact.stoppedBy).toBe('limit')
    expect(exact.results).toHaveLength(1)
    expect(exact.results[0].recipe.map(i => ingredients[i].name)).toEqual(['Mouth Wash'])
    expect(exact.results[0].effects).toBe(fromNames(['Anti-Gravity', 'Balding']))
  })

  // "Can I make [effects] from these drugs with only these ingredients?" A complete search with no
  // results is a definite no.
  it('answers "can I make it with what I have?" definitively', () => {
    const starts = ['OG Kush', 'Sour Diesel', 'Green Crack', 'Granddaddy Purple'].map(startOf)
    const mine = ['Cuke', 'Banana', 'Paracetamol', 'Donut', 'Viagor', 'Mouth Wash'].map(n => ingredientByName(n).index)
    const yes = search(query({ starts, ingredients: mine, include: fromNames(['Anti-Gravity', 'Tropic Thunder', 'Energizing']), limit: 1 }))
    expect(yes.results).toHaveLength(1)
    expectValid(yes.results)
    expect(yes.results[0].recipe.every(i => mine.includes(i))).toBe(true)

    const no = search(query({ starts, ingredients: mine, include: fromNames(['Lethal']), maxMixes: 6, limit: 1 }))
    expect(no.stoppedBy).toBe('exhausted')
    expect(no.results).toHaveLength(0)
  })

  // "What's the fewest ingredients to add to any drug to get [effects]?"
  it('searches from every product at once', () => {
    const include = fromNames(['Cyclopean', 'Long Faced', 'Electrifying'])
    const any = search(query({ starts: products.map(p => startOf(p.name)), include, ranking: 'mixes', limit: 1 }))
    expectValid(any.results)
    for (const p of products) {
      const one = search(query({ starts: [startOf(p.name)], include, ranking: 'mixes', limit: 1 }))
      if (one.results.length > 0) expect(any.results[0].mixes).toBeLessThanOrEqual(one.results[0].mixes)
    }
  })

  // "I already have a drug with [effects]; what can I add to get [more]?"
  it('starts from a drug that is already mixed', () => {
    const effects = fromNames(['Anti-Gravity', 'Balding'])
    const outcome = search(query({ starts: [{ product: productByName('OG Kush').index, effects }], include: fromNames(['Anti-Gravity', 'Balding', 'Glowing']), limit: 1 }))
    expectValid(outcome.results)
    expect(outcome.results[0].start).toBe(effects)
  })
})

describe('ranking by customer favourites', () => {
  const group = customers.filter(c => c.region === 'Docks')
  const weights = favouriteWeights(group)
  const total = (set: EffectSet) => group.reduce((sum, c) => sum + matchCount(c, set), 0)

  it('finds the lowest and highest standards in a group', () => {
    const group = customers.filter(c => c.standards === 'Low' || c.standards === 'High')
    expect(standardsRange(group)).toEqual({ lowest: 'Low', highest: 'High' })
    expect(standardsRange([group[0]])).toEqual({ lowest: group[0].standards, highest: group[0].standards })
    expect(standardsRange([])).toBeNull()
  })

  it('weights add up to the total matches across customers', () => {
    const set = fromNames(['Spicy', 'Toxic', 'Euphoric', 'Paranoia'])
    expect(toEffects(set).reduce((sum, e) => sum + weights[e.index], 0)).toBe(total(set))
  })

  it('finds the best score, then profit, agreeing with brute force', () => {
    const start = startOf('OG Kush')
    const product = products[start.product]
    let best = { score: -1, profit: -Infinity }
    for (const [set, [cost]] of bruteForce(start.effects, all, 3, true)) {
      const candidate = { score: total(set), profit: askingPrice(product, set) - cost }
      if (candidate.score > best.score || (candidate.score === best.score && candidate.profit > best.profit)) best = candidate
    }
    const outcome = search(query({ starts: [start], ranking: 'score', weights, maxMixes: 3, limit: 5 }))
    expectValid(outcome.results)
    const top = outcome.results[0]
    expect(total(top.effects)).toBe(best.score)
    expect(askingPrice(product, top.effects) - top.cost).toBe(best.profit)
  })
})

// The wiki's Meth and Cocaine tables are "guaranteed to be the best mixes". For Cocaine at 5 and
// 6 mixes the wiki reuses the Meth recipes; at Cocaine's higher base price these do better
// (confirmed by trying every 5-mix recipe):
//   5: Mega Bean, Cuke, Banana, Horse Semen, Iodine            $488 (wiki $486)
//   6: Mega Bean, Cuke, Banana, Viagor, Horse Semen, Iodine    $553 (wiki $549)
const wikiCorrections: Record<string, number> = { 'Cocaine 5': 488, 'Cocaine 6': 553 }

describe('matches the wiki’s best profit within each number of mixes', () => {
  const exhaustive = strategies.drugTypes.filter(d => d.tableSource === 'scriptedExhaustive').flatMap(d => d.recipes)
  const maxMixes = Math.max(...exhaustive.map(r => r.mixSteps))
  for (let mixes = 1; mixes <= maxMixes; mixes++) {
    it(`${mixes} mixes`, () => {
      const rows = exhaustive.filter(r => r.mixSteps === mixes)
      const outcome = search(query({ starts: rows.map(r => startOf(r.baseProduct)), ranking: 'profit', maxMixes: mixes, limit: Infinity }))
      expect(outcome.stoppedBy).toBe('exhausted')
      for (const row of rows) {
        const product = productByName(row.baseProduct)
        const best = outcome.results.find(r => r.products[0] === product.index)!
        expectValid([best])
        const effects = mixSteps(product, best.recipe.map(i => ingredients[i])).at(-1)!
        expect(askingPrice(product, effects) - best.cost).toBe(wikiCorrections[`${row.baseProduct} ${mixes}`] ?? row.profit)
      }
    }, 300_000)
  }
})
