import { useState } from 'react'
import { EffectSetPicker, WantedEffectsPicker, type Want } from '../components/EffectPicker'
import { ResultCard } from '../components/ResultCard'
import { SearchStatus } from '../components/SearchStatus'
import { effects, ingredients, products } from '../engine/data'
import { EMPTY, fromIndices } from '../engine/effectSet'
import { MAX_EFFECTS, startingEffects } from '../engine/mix'
import type { Query, Ranking } from '../engine/search'
import { useSearch } from '../engine/useSearch'
import { routeHref } from '../router'
import { useStock } from '../stock'

const RANKINGS: { value: Ranking; label: string }[] = [
  { value: 'cost', label: 'Cheapest' },
  { value: 'mixes', label: 'Fewest mixes' },
  { value: 'profit', label: 'Most profit' },
]

const RESULT_LIMIT = 25

/** Reads "?include=Spicy,Toxic", so other pages can link to a ready-made search. */
function wantedFromParams(params: URLSearchParams): Map<number, Want> {
  const names = (params.get('include') ?? '').split(',')
  return new Map(effects.filter(e => e.obtainable && names.includes(e.name)).map(e => [e.index, 'include'] as const))
}

export function Finder({ params }: { params: URLSearchParams }) {
  const stock = useStock()
  const search = useSearch()

  const [startMode, setStartMode] = useState<'unmixed' | 'mixed'>('unmixed')
  const [startProducts, setStartProducts] = useState<Set<number>>(() => new Set(stock.products))
  const [mixedProduct, setMixedProduct] = useState(0)
  const [mixedEffects, setMixedEffects] = useState<Set<number>>(new Set())
  const [wanted, setWanted] = useState(() => wantedFromParams(params))
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
          search.state.outcome.results.map((r, i) => <ResultCard key={i} result={r} highlight={search.state.status === 'done' ? search.state.query.include : EMPTY} />)}
      </section>
    </div>
  )
}

