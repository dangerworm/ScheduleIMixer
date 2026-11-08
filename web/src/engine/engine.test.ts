import { describe, expect, it } from 'vitest'
import strategies from '@data/max-profit-strategies.json'
import { ingredientByName, productByName } from './data'
import { fromNames, size, toEffects } from './effectSet'
import { describeMix, mix, mixSteps, startingEffects } from './mix'
import { askingPrice, recipeCost } from './price'

const recipes = strategies.drugTypes.flatMap(d => d.recipes.map(r => ({ ...r, tableSource: d.tableSource })))
const label = (r: (typeof recipes)[number]) => `${r.baseProduct}: ${r.ingredients.join(' → ')}`

describe('mixing reproduces the wiki recipes', () => {
  it.each(recipes.map(r => [label(r), r] as const))('%s', (_, r) => {
    const product = productByName(r.baseProduct)
    const recipe = r.ingredients.map(ingredientByName)
    const steps = mixSteps(product, recipe)
    const result = steps[steps.length - 1]
    recipe.forEach((ingredient, i) => expect(describeMix(steps[i], ingredient).result).toBe(steps[i + 1]))

    expect(toEffects(result).map(e => e.name).sort()).toEqual([...r.effects].sort())
    // The wiki lists this row's ingredient cost as $32; its ingredients add up to $33.
    const wikiArithmeticError = r.baseProduct === 'Granddaddy Purple' && r.mixSteps === 7
    if (!wikiArithmeticError) expect(recipeCost(recipe)).toBe(r.ingredientCost)
    expect(askingPrice(product, result)).toBe(r.askingPrice)
  })
})

describe('prices', () => {
  it.each([
    ['OG Kush', 38],
    ['Sour Diesel', 40],
    ['Green Crack', 43],
    ['Granddaddy Purple', 44],
    ['Methamphetamine', 70],
    ['Shrooms', 100],
    ['Cocaine', 150],
  ])('unmixed %s sells for $%i', (name, price) => {
    const product = productByName(name)
    expect(askingPrice(product, startingEffects(product))).toBe(price)
  })
})

describe('mixing rules', () => {
  it('never exceeds 8 effects, but still transforms when full', () => {
    let set = fromNames(['Anti-Gravity', 'Balding', 'Bright-Eyed', 'Calming', 'Cyclopean', 'Foggy', 'Glowing', 'Euphoric'])
    set = mix(set, ingredientByName('Cuke'))
    expect(size(set)).toBe(8)
    expect(toEffects(set).map(e => e.name)).toContain('Laxative')
    expect(toEffects(set).map(e => e.name)).not.toContain('Energizing')
  })
})

