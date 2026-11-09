import { effectByName, effects, type Effect } from './data'

/**
 * A set of effects as a bitmask, one bit per effect index. There are more than 32 effects, so this
 * is a plain number (exact up to 2^53) manipulated with arithmetic rather than bitwise operators.
 */
export type EffectSet = number

const TWO_32 = 2 ** 32
const BITS = effects.map((_, i) => 2 ** i)

export const EMPTY: EffectSet = 0

export function has(set: EffectSet, effect: number): boolean {
  return Math.floor(set / BITS[effect]) % 2 === 1
}

/** Adds an effect the set doesn't already contain. */
export function add(set: EffectSet, effect: number): EffectSet {
  return set + BITS[effect]
}

/** Swaps one effect for another; `from` must be present and `to` absent. */
export function swap(set: EffectSet, from: number, to: number): EffectSet {
  return set - BITS[from] + BITS[to]
}

function popcount32(n: number): number {
  n = n - ((n >>> 1) & 0x55555555)
  n = (n & 0x33333333) + ((n >>> 2) & 0x33333333)
  return (((n + (n >>> 4)) & 0x0f0f0f0f) * 0x01010101) >>> 24
}

export function size(set: EffectSet): number {
  return popcount32(set % TWO_32) + popcount32(Math.floor(set / TWO_32))
}

/** True when `set` contains every effect in `subset`. */
export function containsAll(set: EffectSet, subset: EffectSet): boolean {
  const setLo = set % TWO_32, subLo = subset % TWO_32
  const setHi = Math.floor(set / TWO_32), subHi = Math.floor(subset / TWO_32)
  return ((setLo & subLo) >>> 0) === subLo && ((setHi & subHi) >>> 0) === subHi
}

/** True when `set` and `other` have no effects in common. */
export function containsNone(set: EffectSet, other: EffectSet): boolean {
  return (set % TWO_32 & other % TWO_32) === 0 && (Math.floor(set / TWO_32) & Math.floor(other / TWO_32)) === 0
}

/** Calls `visit` with the index of each effect in the set; quicker than checking every effect. */
export function forEachEffect(set: EffectSet, visit: (effect: number) => void) {
  for (let word = 0, bits = set % TWO_32 | 0; word < 2; word++, bits = Math.floor(set / TWO_32) | 0) {
    while (bits !== 0) {
      const lowest = bits & -bits
      visit(word * 32 + 31 - Math.clz32(lowest))
      bits ^= lowest
    }
  }
}

export function toEffects(set: EffectSet): Effect[] {
  return effects.filter(e => has(set, e.index))
}

export function fromIndices(indices: Iterable<number>): EffectSet {
  let set = EMPTY
  for (const i of indices) if (!has(set, i)) set = add(set, i)
  return set
}

export function fromNames(names: Iterable<string>): EffectSet {
  return fromIndices([...names].map(n => effectByName(n).index))
}
