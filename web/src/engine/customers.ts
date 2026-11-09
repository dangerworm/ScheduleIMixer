import { effects, STANDARDS, type Customer, type Standards } from './data'
import { has, type EffectSet } from './effectSet'

/**
 * How many of the customers like each effect, indexed by effect. A drug's total for its effects is
 * the number of favourite-effect matches summed across all the customers.
 */
export function favouriteWeights(group: readonly Customer[]): number[] {
  const weights = effects.map(() => 0)
  for (const customer of group) for (const e of customer.favouriteEffects) weights[e]++
  return weights
}

export function matchCount(customer: Customer, set: EffectSet): number {
  return customer.favouriteEffects.filter(e => has(set, e)).length
}

export interface StandardsRange {
  /** The lowest standards in the group: meeting these suits at least one customer. */
  lowest: Standards
  /** The highest standards in the group: meeting these suits every customer. */
  highest: Standards
}

export function standardsRange(group: readonly Customer[]): StandardsRange | null {
  if (group.length === 0) return null
  const levels = group.map(c => STANDARDS.indexOf(c.standards))
  return { lowest: STANDARDS[Math.min(...levels)], highest: STANDARDS[Math.max(...levels)] }
}
