import type { Ingredient, Product } from './data'
import { add, EMPTY, has, size, swap, type EffectSet } from './effectSet'

export const MAX_EFFECTS = 8

export function startingEffects(product: Product): EffectSet {
  return product.baseEffect === null ? EMPTY : add(EMPTY, product.baseEffect)
}

/**
 * Mixes one ingredient into a product. Verified against every recipe on the wiki's
 * Best Mixing Recipes tables:
 * 1. Transformations apply in the ingredient's listed order, to effects present before mixing.
 * 2. A transformation is skipped if its result is already present, including one produced
 *    earlier in the same mix.
 * 3. The ingredient's own effect is then added if it's new and there's room.
 */
export function mix(set: EffectSet, ingredient: Ingredient): EffectSet {
  let result = set
  for (const [from, to] of ingredient.transformations) {
    if (has(set, from) && !has(result, to)) result = swap(result, from, to)
  }
  if (!has(result, ingredient.baseEffect) && size(result) < MAX_EFFECTS) {
    result = add(result, ingredient.baseEffect)
  }
  return result
}

export interface MixDetails {
  result: EffectSet
  /** [from, to] transformations that applied. */
  transformed: [number, number][]
  /** The ingredient's own effect, if it was added. */
  added: number | null
  /** True when the ingredient's effect was new but there was no room for it. */
  blockedByLimit: boolean
}

/** The same as `mix`, but explains what happened, for display. */
export function describeMix(set: EffectSet, ingredient: Ingredient): MixDetails {
  let result = set
  const transformed: [number, number][] = []
  for (const [from, to] of ingredient.transformations) {
    if (has(set, from) && !has(result, to)) {
      result = swap(result, from, to)
      transformed.push([from, to])
    }
  }
  let added: number | null = null
  let blockedByLimit = false
  if (!has(result, ingredient.baseEffect)) {
    if (size(result) < MAX_EFFECTS) {
      result = add(result, ingredient.baseEffect)
      added = ingredient.baseEffect
    } else {
      blockedByLimit = true
    }
  }
  return { result, transformed, added, blockedByLimit }
}

/** The effects after each step of a recipe; element 0 is the unmixed product. */
export function mixSteps(product: Product, recipe: readonly Ingredient[]): EffectSet[] {
  const steps = [startingEffects(product)]
  for (const ingredient of recipe) steps.push(mix(steps[steps.length - 1], ingredient))
  return steps
}
