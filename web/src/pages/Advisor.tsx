import { useState } from 'react'
import { EffectChip } from '../components/EffectChip'
import { ResultCard } from '../components/ResultCard'
import { SearchStatus } from '../components/SearchStatus'
import { customers, effects, products, regions, type Customer, type Standards } from '../engine/data'
import { favouriteWeights, matchCount, standardsRange } from '../engine/customers'
import { fromIndices } from '../engine/effectSet'
import { startingEffects } from '../engine/mix'
import type { Result } from '../engine/search'
import { useSearch } from '../engine/useSearch'
import { routeHref } from '../router'
import { useStock } from '../stock'

const ALL_REGIONS = 'All regions'
const RESULT_LIMIT = 20

const inRegion = (region: string) => customers.filter(c => region === ALL_REGIONS || c.region === region)

export function Advisor() {
  const stock = useStock()
  const search = useSearch()

  const [region, setRegion] = useState(regions[0])
  const [selected, setSelected] = useState<Set<number>>(() => new Set(inRegion(regions[0]).map(c => c.index)))
  const [startProducts, setStartProducts] = useState<Set<number>>(() => new Set(stock.products))
  const [maxMixes, setMaxMixes] = useState(6)

  const regionCustomers = inRegion(region)
  const audience = customers.filter(c => selected.has(c.index))
  const weights = favouriteWeights(audience)
  const tally = effects.filter(e => weights[e.index] > 0).sort((a, b) => weights[b.index] - weights[a.index] || a.name.localeCompare(b.name))
  const liked = fromIndices(tally.map(e => e.index))
  const starts = [...startProducts].filter(p => stock.hasProduct(p)).map(p => ({ product: p, effects: startingEffects(products[p]) }))

  const problem =
    tally.length === 0
      ? 'Choose at least one customer with favourite effects.'
      : starts.length === 0
        ? 'Choose at least one product to start from.'
        : stock.ingredients.length === 0
          ? 'You have no ingredients ticked in My stock.'
          : null

  const chooseRegion = (next: string) => {
    setRegion(next)
    setSelected(new Set(inRegion(next).map(c => c.index)))
  }

  const toggleCustomer = (index: number) =>
    setSelected(current => {
      const next = new Set(current)
      if (next.has(index)) next.delete(index)
      else next.add(index)
      return next
    })

  const toggleProduct = (index: number) =>
    setStartProducts(current => {
      const next = new Set(current)
      if (next.has(index)) next.delete(index)
      else next.add(index)
      return next
    })

  const run = () =>
    search.run({
      starts,
      ingredients: stock.ingredients,
      include: 0,
      exclude: 0,
      exact: false,
      ranking: 'score',
      weights,
      maxMixes,
      limit: RESULT_LIMIT,
    })

  const single = audience.length === 1 ? audience[0] : null

  return (
    <div className="finder">
      <section className="panel finder__form">
        <h2>Customers</h2>
        <select value={region} onChange={e => chooseRegion(e.target.value)}>
          {[...regions, ALL_REGIONS].map(r => (
            <option key={r} value={r}>
              {r} ({inRegion(r).length})
            </option>
          ))}
        </select>
        <div className="panel__header customer-list__header">
          <span className="hint">
            {audience.length} of {regionCustomers.length} selected
          </span>
          <button onClick={() => setSelected(new Set(regionCustomers.map(c => c.index)))}>All</button>
          <button onClick={() => setSelected(new Set())}>None</button>
        </div>
        <ul className="customer-list">
          {regionCustomers.map(c => (
            <li key={c.index}>
              <label className="customer">
                <input type="checkbox" checked={selected.has(c.index)} onChange={() => toggleCustomer(c.index)} />
                <span className="customer__name">{c.name}</span>
                <span className="customer__meta">
                  {region === ALL_REGIONS && `${c.region} · `}
                  {c.standards} standards
                </span>
                <span className="chips customer__effects">
                  {c.favouriteEffects.length === 0 && <span className="hint">No favourite effects</span>}
                  {c.favouriteEffects.map(e => (
                    <EffectChip key={e} effect={effects[e]} />
                  ))}
                </span>
              </label>
            </li>
          ))}
        </ul>

        <QualityNeeded audience={audience} />

        {single && single.favouriteEffects.some(e => effects[e].obtainable) && (
          <p className="hint">
            <a href={routeHref('finder', { include: single.favouriteEffects.filter(e => effects[e].obtainable).map(e => effects[e].name).join(',') })}>
              Find the cheapest recipe with all of {single.name}'s favourites →
            </a>
          </p>
        )}

        <h2>Their favourite effects</h2>
        {tally.length === 0 ? (
          <p className="hint">None selected.</p>
        ) : (
          <div className="chips tally">
            {tally.map(e => (
              <span key={e.index} className="tally__item">
                <EffectChip effect={e} />
                <span className="tally__count">×{weights[e.index]}</span>
              </span>
            ))}
          </div>
        )}
        {tally.some(e => !e.obtainable) && <p className="hint">Lethal can't be made by mixing, so no recipe will match it.</p>}

        <h2>Start from</h2>
        <div className="toggle-list">
          {products.map(p => (
            <button
              key={p.index}
              className={`toggle ${startProducts.has(p.index) && stock.hasProduct(p.index) ? 'active' : ''}`}
              disabled={!stock.hasProduct(p.index)}
              title={stock.hasProduct(p.index) ? undefined : 'Not in My stock'}
              onClick={() => toggleProduct(p.index)}
            >
              {p.name}
            </button>
          ))}
        </div>

        <div className="limits">
          <label>
            Max mixes
            <input type="number" min={1} max={10} value={maxMixes} onChange={e => setMaxMixes(Math.max(1, Math.min(10, Number(e.target.value) || 1)))} />
          </label>
        </div>
        <p className="hint">
          Recipes are ranked by how many favourite effects they match across the selected customers, then by profit. Every combination
          is checked, so each extra mix takes several times longer: with every product, 6 mixes takes a second or two, 7 several
          seconds and 8 about half a minute.
        </p>

        <div className="toolbar">
          {search.state.status === 'running' ? (
            <button onClick={search.cancel}>Cancel</button>
          ) : (
            <button className="primary" onClick={run} disabled={problem !== null}>
              Find best recipes
            </button>
          )}
          {problem && <span className="hint">{problem}</span>}
        </div>
      </section>

      <section className="finder__results">
        <SearchStatus state={search.state} />
        {search.state.status === 'done' &&
          search.state.outcome.results.map((r, i) => (
            <ResultCard key={i} result={r} highlight={liked}>
              <Matches result={r} audience={audience} />
            </ResultCard>
          ))}
      </section>
    </div>
  )
}

/** The quality a drug needs to meet the standards of at least one, and all, of the customers. */
function QualityNeeded({ audience }: { audience: Customer[] }) {
  const range = standardsRange(audience)
  if (!range) return null
  const who = (standards: Standards) => {
    const names = audience.filter(c => c.standards === standards).map(c => c.name)
    return names.length <= 3 ? names.join(', ') : `${names.length} customers`
  }
  if (range.lowest === range.highest)
    return (
      <p className="hint standards">
        All the selected customers have <strong>{range.lowest}</strong> standards.
      </p>
    )
  return (
    <dl className="standards">
      <dt>Suits at least one customer</dt>
      <dd>
        <strong>{range.lowest}</strong> standards or better <span className="hint">({who(range.lowest)})</span>
      </dd>
      <dt>Suits every customer</dt>
      <dd>
        <strong>{range.highest}</strong> standards or better <span className="hint">({who(range.highest)})</span>
      </dd>
    </dl>
  )
}

/** How many favourites the recipe matches, and for whom. */
function Matches({ result, audience }: { result: Result; audience: Customer[] }) {
  const withFavourites = audience.filter(c => c.favouriteEffects.length > 0)
  const byCount = new Map<number, Customer[]>()
  let total = 0
  for (const c of withFavourites) {
    const n = matchCount(c, result.effects)
    total += n
    if (n > 0) byCount.set(n, [...(byCount.get(n) ?? []), c])
  }
  const counts = [...byCount.keys()].sort((a, b) => b - a)
  const pleased = counts.reduce((sum, n) => sum + byCount.get(n)!.length, 0)
  return (
    <div className="result__row">
      <span className="result__label">Suits</span>
      <div className="matches">
        <div>
          <strong>{total}</strong> favourite {total === 1 ? 'match' : 'matches'} · {pleased} of {withFavourites.length} customers like at least one effect
        </div>
        {counts.map(n => (
          <div key={n} className="matches__group">
            <span className="matches__count">{n} matched:</span>{' '}
            {byCount
              .get(n)!
              .map(c => c.name)
              .join(', ')}
          </div>
        ))}
      </div>
    </div>
  )
}
