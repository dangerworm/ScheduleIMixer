import effectsJson from '@data/effects.json'
import ingredientsJson from '@data/ingredients.json'
import productsJson from '@data/products.json'

export interface Effect {
  index: number
  name: string
  /** Added to the price multiplier, e.g. 0.54 for the wiki's "x1.54". */
  bonus: number
  /** The same bonus in hundredths, so prices can be calculated exactly. */
  bonusHundredths: number
  colour: string
  obtainable: boolean
}

export interface Ingredient {
  index: number
  name: string
  price: number
  rankRequirement: string | null
  baseEffect: number
  /** [from, to] effect indices, in the order the game applies them. */
  transformations: [number, number][]
}

export interface Product {
  index: number
  name: string
  type: string
  basePrice: number
  baseEffect: number | null
}

export const effects: Effect[] = effectsJson.effects.map((e, index) => {
  const bonusHundredths = Math.round(e.multiplier * 100) - 100
  return { index, name: e.name, bonus: bonusHundredths / 100, bonusHundredths, colour: e.colour, obtainable: e.obtainable }
})

const effectIndex = new Map(effects.map(e => [e.name, e.index]))

export function effectByName(name: string): Effect {
  const index = effectIndex.get(name)
  if (index === undefined) throw new Error(`Unknown effect "${name}"`)
  return effects[index]
}

export const ingredients: Ingredient[] = ingredientsJson.ingredients.map((i, index) => ({
  index,
  name: i.name,
  price: i.price,
  rankRequirement: i.rankRequirement,
  baseEffect: effectByName(i.baseEffect).index,
  transformations: i.transformations.map(t => [effectByName(t.from).index, effectByName(t.to).index]),
}))

export const products: Product[] = productsJson.products.map((p, index) => ({
  index,
  name: p.name,
  type: p.type,
  basePrice: p.basePrice,
  baseEffect: p.baseEffect === null ? null : effectByName(p.baseEffect).index,
}))

export function ingredientByName(name: string): Ingredient {
  const ingredient = ingredients.find(i => i.name === name)
  if (!ingredient) throw new Error(`Unknown ingredient "${name}"`)
  return ingredient
}

export function productByName(name: string): Product {
  const product = products.find(p => p.name === name)
  if (!product) throw new Error(`Unknown product "${name}"`)
  return product
}
