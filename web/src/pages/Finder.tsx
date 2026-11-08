import { useState } from 'react'
import { EffectChip } from '../components/EffectChip'
import { EffectSetPicker, WantedEffectsPicker, type Want } from '../components/EffectPicker'
import { effects, ingredients, products } from '../engine/data'
import { EMPTY, fromIndices, has, toEffects } from '../engine/effectSet'
import { MAX_EFFECTS, startingEffects } from '../engine/mix'
import { askingPrice } from '../engine/price'
import type { Query, Ranking, Result } from '../engine/search'
import { useSearch } from '../engine/useSearch'
import { routeHref } from '../router'
import { useStock } from '../stock'

const RANKINGS: { value: Ranking; label: string }[] = [
  { value: 'cost', label: 'Cheapest' },
  { value: 'mixes', label: 'Fewest mixes' },
  { value: 'profit', label: 'Most profit' },
]

const RESULT_LIMIT = 25
const number = new Intl.NumberFormat()

export function Finder() {
  const stock = useStock()
  const search = useSearch()

  const [startMode, setStartMode] = useState<'unmixed' | 'mixed'>('unmixed')
  const [startProducts, setStartProducts] = useState<Set<number>>(() => new Set(stock.products))
  const [mixedProduct, setMixedProduct] = useState(0)
  const [mixedEffects, setMixedEffects] = useState<Set<number>>(new Set())
  const [wanted, setWanted] = useState<Map<number, Want>>(new Map())
  const [exact, setExact] = useState(false)
  const [ranking, setRanking] = useState<Ranking>('cost')
  const [maxMixes, setMaxMixes] = useState(8)
  const [maxCost, setMaxCost] = useState('')

  const usableProducts = [...startProducts].filter(p => stock.hasProduct(p))
  const starts =
    startMode === 'unmixed'
      ? usableProducts.map(p => ({ product: p, effects: startingEffects(products[p]) }))
      : [{ product: mixedProduct, effects: fromIndices(mixedEffects) }]
  const include = fromIndices([...wanted].filter(([, w]) => w === 'include').map(([e]) => e))
  const exclude = fromIndices([...wanted].filter(([, w]) => w === 'exclude').map(([e]) => e))
  const problem =
    starts.length === 0
      ? 'Choose at least one product to start from.'
      : stock.ingredients.length === 0
        ? 'You have no ingredients ticked in My stock.'
        : include === EMPTY && ranking !== 'profit'
          ? 'Choose at least one effect you want (or rank by profit).'
          : null

  const run = () => {
    const query: Query = {
      starts,
      ingredients: stock.ingredients,
      include,
      exclude,
      exact,
      ranking,
      maxMixes,
      maxCost: maxCost === '' ? undefined : Number(maxCost),
      limit: RESULT_LIMIT,
    }
    search.run(query)
  }

  const toggleStartProduct = (p: number) =>
    setStartProducts(current => {
      const next = new Set(current)
      if (next.has(p)) next.delete(p)
      else next.add(p)
      return next
    })

  return (
    <div className="finder">
      <section className="panel finder__form">
        <h2>Start from</h2>
        <div className="segmented">
          <button className={startMode === 'unmixed' ? 'active' : ''} onClick={() => setStartMode('unmixed')}>
            Unmixed products
          </button>
          <button className={startMode === 'mixed' ? 'active' : ''} onClick={() => setStartMode('mixed')}>
            A drug I've already mixed
          </button>
        </div>
        {startMode === 'unmixed' ? (
          <div className="toggle-list">
            {products.map(p => (
              <button
                key={p.index}
                className={`toggle ${startProducts.has(p.index) && stock.hasProduct(p.index) ? 'active' : ''}`}
                disabled={!stock.hasProduct(p.index)}
                title={stock.hasProduct(p.index) ? undefined : 'Not in My stock'}
                onClick={() => toggleStartProduct(p.index)}
              >
                {p.name}
              </button>
            ))}
          </div>
        ) : (
          <>
            <select value={mixedProduct} onChange={e => setMixedProduct(Number(e.target.value))}>
              {products.map(p => (
                <option key={p.index} value={p.index}>
                  {p.name}
                </option>
              ))}
            </select>
            <p className="hint">Its current effects (up to {MAX_EFFECTS}):</p>
            <EffectSetPicker value={mixedEffects} onChange={setMixedEffects} max={MAX_EFFECTS} />
          </>
        )}

        <h2>Effects</h2>
        <p className="hint">Click once for an effect you want, twice for one you don't, three times to clear.</p>
        <WantedEffectsPicker value={wanted} onChange={setWanted} />
        <label className="inline-check">
          <input type="checkbox" checked={exact} onChange={e => setExact(e.target.checked)} />
          Exactly the wanted effects, nothing else
        </label>

        <h2>Rank by</h2>
        <div className="segmented">
          {RANKINGS.map(r => (
            <button key={r.value} className={ranking === r.value ? 'active' : ''} onClick={() => setRanking(r.value)}>
              {r.label}
            </button>
          ))}
        </div>

        <div className="limits">
          <label>
            Max mixes
            <input type="number" min={1} max={12} value={maxMixes} onChange={e => setMaxMixes(Math.max(1, Math.min(12, Number(e.target.value) || 1)))} />
          </label>
          <label>
            Max ingredient cost
            <input type="number" min={0} placeholder="Any" value={maxCost} onChange={e => setMaxCost(e.target.value)} />
          </label>
        </div>
        <p className="hint">
          Using {stock.ingredients.length} of {ingredients.length} ingredients from <a href={routeHref('stock')}>My stock</a>.
          {ranking === 'profit' && maxMixes > 7 && ' Ranking by profit checks every combination, so 8+ mixes can take a while.'}
        </p>

        <div className="toolbar">
          {search.state.status === 'running' ? (
            <button onClick={search.cancel}>Cancel</button>
          ) : (
            <button className="primary" onClick={run} disabled={problem !== null}>
              Search
            </button>
          )}
          {problem && <span className="hint">{problem}</span>}
        </div>
      </section>

      <section className="finder__results">
        <SearchStatus state={search.state} />
        {search.state.status === 'done' &&
          search.state.outcome.results.map((r, i) => <ResultCard key={i} result={r} include={search.state.status === 'done' ? search.state.query.include : EMPTY} />)}
      </section>
    </div>
  )
}

function SearchStatus({ state }: { state: ReturnType<typeof useSearch>['state'] }) {
  if (state.status === 'idle') return <p className="hint">Results will appear here.</p>
  if (state.status === 'error') return <p className="error">Search failed: {state.message}</p>
  if (state.status === 'running') {
    return <p className="hint">Searching… checked {number.format(state.statesExpanded)} combinations.</p>
  }
  const { outcome, query, seconds } = state
  const checked = `Checked ${number.format(outcome.statesExpanded)} combinations in ${seconds.toFixed(1)}s.`
  const limits = `within ${query.maxMixes} mixes${query.maxCost !== undefined ? ` and $${query.maxCost}` : ''} using your ingredients`
  if (outcome.stoppedBy === 'budget') return <p className="warning">Stopped early after too many combinations; there may be better results. {checked}</p>
  if (outcome.results.length === 0) return <p className="warning">Not possible {limits}. {checked}</p>
  if (outcome.stoppedBy === 'exhausted' && query.ranking !== 'profit') {
    return <p className="hint">These are all the matches {limits}. {checked}</p>
  }
  return <p className="hint">{checked}</p>
}

function ResultCard({ result, include }: { result: Result; include: number }) {
  const started = result.products.every(p => startingEffects(products[p]) === result.start)
  return (
    <article className="panel result">
      <header className="result__header">
        <span className="result__products">{result.products.map(p => products[p].name).join(' / ')}</span>
        <span className="muted">
          {result.mixes} {result.mixes === 1 ? 'mix' : 'mixes'} · ${result.cost}
        </span>
      </header>
      {!started && (
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
            <EffectChip key={e.index} effect={effects[e.index]} variant={has(include, e.index) ? 'wanted' : 'normal'} />
          ))}
        </div>
      </div>
      <div className="result__prices">
        {result.products.map(p => {
          const price = askingPrice(products[p], result.effects)
          return (
            <span key={p}>
              {result.products.length > 1 && `${products[p].name}: `}sells for <strong>${price}</strong>, profit <strong>${price - result.cost}</strong>
            </span>
          )
        })}
        {started && (
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
