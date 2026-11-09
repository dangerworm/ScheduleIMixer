import type { ReactNode } from 'react'
import { ingredients, products } from '../engine/data'
import { has, toEffects, type EffectSet } from '../engine/effectSet'
import { startingEffects } from '../engine/mix'
import { askingPrice } from '../engine/price'
import type { Result } from '../engine/search'
import { routeHref } from '../router'
import { EffectChip } from './EffectChip'

interface Props {
  result: Result
  /** Effects to outline in the result. */
  highlight: EffectSet
  /** Extra rows, shown under the effects. */
  children?: ReactNode
}

export function ResultCard({ result, highlight, children }: Props) {
  const unmixedStart = result.products.every(p => startingEffects(products[p]) === result.start)
  return (
    <article className="panel result">
      <header className="result__header">
        <span className="result__products">{result.products.map(p => products[p].name).join(' / ')}</span>
        <span className="muted">
          {result.mixes} {result.mixes === 1 ? 'mix' : 'mixes'} · ${result.cost}
        </span>
      </header>
      {!unmixedStart && (
        <div className="result__row">
          <span className="result__label">From</span>
          <div className="chips">
            {toEffects(result.start).map(e => (
              <EffectChip key={e.index} effect={e} />
            ))}
          </div>
        </div>
      )}
      <div className="result__row">
        <span className="result__label">Add</span>
        <ol className="recipe">
          {result.recipe.map((i, step) => (
            <li key={step}>{ingredients[i].name}</li>
          ))}
          {result.recipe.length === 0 && <li>Nothing — it already matches</li>}
        </ol>
      </div>
      <div className="result__row">
        <span className="result__label">Gives</span>
        <div className="chips">
          {toEffects(result.effects).map(e => (
            <EffectChip key={e.index} effect={e} variant={has(highlight, e.index) ? 'wanted' : 'normal'} />
          ))}
        </div>
      </div>
      {children}
      <div className="result__prices">
        {result.products.map(p => {
          const price = askingPrice(products[p], result.effects)
          return (
            <span key={p}>
              {result.products.length > 1 && `${products[p].name}: `}sells for <strong>${price}</strong>, profit <strong>${price - result.cost}</strong>
            </span>
          )
        })}
        {unmixedStart && (
          <a
            href={routeHref('simulator', {
              product: products[result.products[0]].name,
              recipe: result.recipe.map(i => ingredients[i].name).join(','),
            })}
          >
            Open in Simulator
          </a>
        )}
      </div>
    </article>
  )
}
