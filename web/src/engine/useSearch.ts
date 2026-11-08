import { useCallback, useEffect, useRef, useState } from 'react'
import type { Outcome, Query } from './search'
import type { WorkerRequest, WorkerResponse } from './worker'

export type SearchState =
  | { status: 'idle' }
  | { status: 'running'; statesExpanded: number }
  | { status: 'done'; outcome: Outcome; query: Query; seconds: number }
  | { status: 'error'; message: string }

const createWorker = () => new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' })

/** Runs searches in a Web Worker. Cancelling terminates the worker, since a search can't be interrupted. */
export function useSearch() {
  const worker = useRef<Worker | null>(null)
  const nextId = useRef(0)
  const [state, setState] = useState<SearchState>({ status: 'idle' })

  useEffect(() => () => worker.current?.terminate(), [])

  const cancel = useCallback(() => {
    worker.current?.terminate()
    worker.current = null
    setState({ status: 'idle' })
  }, [])

  const run = useCallback((query: Query) => {
    worker.current?.terminate()
    const w = (worker.current = createWorker())
    const id = ++nextId.current
    const started = performance.now()
    setState({ status: 'running', statesExpanded: 0 })
    w.onmessage = (event: MessageEvent<WorkerResponse>) => {
      const response = event.data
      if (response.id !== id) return
      if (response.type === 'progress') setState({ status: 'running', statesExpanded: response.statesExpanded })
      else if (response.type === 'done') setState({ status: 'done', outcome: response.outcome, query, seconds: (performance.now() - started) / 1000 })
      else setState({ status: 'error', message: response.message })
    }
    w.onerror = event => setState({ status: 'error', message: event.message || 'The search failed' })
    w.postMessage({ id, query } satisfies WorkerRequest)
  }, [])

  return { state, run, cancel }
}
