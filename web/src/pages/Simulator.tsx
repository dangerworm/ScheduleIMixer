import { useEffect, useMemo, useState } from 'react'
import { EffectChip } from '../components/EffectChip'
import { effects, ingredients, products } from '../engine/data'
import { has, toEffects } from '../engine/effectSet'
import { describeMix, startingEffects, type MixDetails } from '../engine/mix'
import { askingPrice, multiplier } from '../engine/price'
import { replaceParams } from '../router'

/** Reads "?product=OG Kush&recipe=Cuke,Banana" so recipes can be bookmarked and shared. */
function readParams(params: URLSearchParams): { product: number; recipe: number[] } {
  const product = products.findIndex(p => p.name === params.get('product'))
  const recipe = (params.get('recipe') ?? '')
    .split(',')
    .map(name => ingredients.findIndex(i => i.name === name))
    .filter(i => i >= 0)
  return { product: Math.max(product, 0), recipe }
}

function writeParams(product: number, recipe: number[]) {
  const params: Record<string, string> = { product: products[product].name }
  if (recipe.length > 0) params.recipe = recipe.map(i => ingredients[i].name).join(',')
  replaceParams('simulator', params)
}

const money = (n: number) => `$${n}`

export function Simulator({ params }: { params: URLSearchParams }) {
  const [initial] = useState(() => readParams(params))
  const [productIndex, setProductIndex] = useState(initial.product)
  const [recipe, setRecipe] = useState<number[]>(initial.recipe)
  const product = products[productIndex]

  useEffect(() => writeParams(productIndex, recipe), [productIndex, recipe])

  const steps = useMemo(() => {
    const rows: { details: MixDetails | null; cost: number }[] = []
    let set = startingEffects(product)
    let cost = 0
    rows.push({ details: { result: set, transformed: [], added: null, blockedByLimit: false }, cost })
    for (const i of recipe) {
      const details = describeMix(set, ingredients[i])
      set = details.result
      cost += ingredients[i].price
      rows.push({ details, cost })
    }
    return rows
  }, [product, recipe])

  const final = steps[steps.length - 1]
  const finalSet = final.details!.result
  const finalPrice = askingPrice(product, finalSet)

  return (
    <div className="simulator">
      <section className="panel">
        <h2>Product</h2>
        <select value={productIndex} onChange={e => setProductIndex(Number(e.target.value))}>
          {products.map(p => (
            <option key={p.index} value={p.index}>
              {p.name}
            </option>
          ))}
        </select>

        <h2>Add ingredient</h2>
        <div className="ingredient-grid">
          {ingredients.map(i => (
            <button key={i.index} className="ingredient" onClick={() => setRecipe([...recipe, i.index])}>
              <span className="ingredient__name">{i.name}</span>
              <span className="ingredient__price">{money(i.price)}</span>
              <EffectChip effect={effects[i.baseEffect]} />
            </button>
          ))}
        </div>
      </section>

      <section className="panel">
        <div className="summary">
          <div>
            <span className="summary__label">Sells for</span>
            <span className="summary__value">{money(finalPrice)}</span>
          </div>
          <div>
            <span className="summary__label">Ingredients</span>
            <span className="summary__value">{money(final.cost)}</span>
          </div>
          <div>
            <span className="summary__label">Profit</span>
            <span className="summary__value">{money(finalPrice - final.cost)}</span>
          </div>
          <div>
            <span className="summary__label">Multiplier</span>
            <span className="summary__value">×{multiplier(finalSet).toFixed(2)}</span>
          </div>
        </div>

        <div className="toolbar">
          <button onClick={() => setRecipe(recipe.slice(0, -1))} disabled={recipe.length === 0}>
            Undo
          </button>
          <button onClick={() => setRecipe([])} disabled={recipe.length === 0}>
            Clear
          </button>
        </div>

        <ol className="steps">
          {steps.map(({ details, cost }, step) => {
            const set = details!.result
            const previous = step === 0 ? null : steps[step - 1].details!.result
            const price = askingPrice(product, set)
            return (
              <li key={step} className="step">
                <div className="step__header">
                  <span className="step__title">
                    {step === 0 ? product.name : `${step}. ${ingredients[recipe[step - 1]].name}`}
                  </span>
                  <span className="step__numbers">
                    {money(price)} · cost {money(cost)} · profit {money(price - cost)}
                  </span>
                  {step > 0 && (
                    <button
                      className="step__remove"
                      aria-label={`Remove step ${step}`}
                      onClick={() => setRecipe(recipe.filter((_, i) => i !== step - 1))}
                    >
                      ×
                    </button>
                  )}
                </div>
                <div className="chips">
                  {toEffects(set).map(e => (
                    <EffectChip key={e.index} effect={e} variant={previous !== null && !has(previous, e.index) ? 'new' : 'normal'} />
                  ))}
                </div>
                {step > 0 && (details!.transformed.length > 0 || details!.blockedByLimit) && (
                  <div className="step__notes">
                    {details!.transformed.map(([from, to]) => (
                      <span key={from}>
                        {effects[from].name} → {effects[to].name}
                      </span>
                    ))}
                    {details!.blockedByLimit && (
                      <span>{effects[ingredients[recipe[step - 1]].baseEffect].name} not added (8 effects)</span>
                    )}
                  </div>
                )}
              </li>
            )
          })}
        </ol>
      </section>
    </div>
  )
}
