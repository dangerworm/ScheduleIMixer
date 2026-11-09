import type { SearchState } from '../engine/useSearch'

const number = new Intl.NumberFormat()

/** Progress, errors and what a finished search's results mean. */
export function SearchStatus({ state, idle = 'Results will appear here.' }: { state: SearchState; idle?: string }) {
  if (state.status === 'idle') return <p className="hint">{idle}</p>
  if (state.status === 'error') return <p className="error">Search failed: {state.message}</p>
  if (state.status === 'running') {
    return <p className="hint">Searching… checked {number.format(state.statesExpanded)} combinations.</p>
  }
  const { outcome, query, seconds } = state
  const checked = `Checked ${number.format(outcome.statesExpanded)} combinations in ${seconds.toFixed(1)}s.`
  const limits = `within ${query.maxMixes} mixes${query.maxCost !== undefined ? ` and $${query.maxCost}` : ''} using your ingredients`
  if (outcome.stoppedBy === 'budget') return <p className="warning">Stopped early after too many combinations; there may be better results. {checked}</p>
  if (outcome.results.length === 0) return <p className="warning">Not possible {limits}. {checked}</p>
  const ranksEverything = query.ranking === 'profit' || query.ranking === 'score'
  if (outcome.stoppedBy === 'exhausted' && !ranksEverything) {
    return <p className="hint">These are all the matches {limits}. {checked}</p>
  }
  return <p className="hint">{checked}</p>
}
