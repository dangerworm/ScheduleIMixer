import { effects, type Ingredient, type Product } from './data'
import { has, type EffectSet } from './effectSet'

/** Total of the effects' bonuses, in hundredths. */
function bonusHundredths(set: EffectSet): number {
  let total = 0
  for (const e of effects) if (has(set, e.index)) total += e.bonusHundredths
  return total
}

/** The price multiplier shown in game, e.g. 1.84 for OG Kush mixed with Mouth Wash. */
export function multiplier(set: EffectSet): number {
  return (100 + bonusHundredths(set)) / 100
}

/**
 * basePrice × (1 + total bonus), rounded half to even like Unity's Mathf.RoundToInt
 * (unmixed OG Kush is 35 × 1.10 = 38.5, sold for $38). Uses integers to avoid float drift.
 */
export function askingPrice(product: Product, set: EffectSet): number {
  const hundredths = product.basePrice * (100 + bonusHundredths(set))
  const whole = Math.floor(hundredths / 100)
  const remainder = hundredths % 100
  if (remainder > 50 || (remainder === 50 && whole % 2 === 1)) return whole + 1
  return whole
}

export function recipeCost(recipe: readonly Ingredient[]): number {
  return recipe.reduce((total, i) => total + i.price, 0)
}
