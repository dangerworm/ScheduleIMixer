import { search, type Outcome, type Query } from './search'

export type WorkerRequest = { id: number; query: Query }
export type WorkerResponse =
  | { id: number; type: 'progress'; statesExpanded: number }
  | { id: number; type: 'done'; outcome: Outcome }
  | { id: number; type: 'error'; message: string }

self.onmessage = (event: MessageEvent<WorkerRequest>) => {
  const { id, query } = event.data
  const post = (response: WorkerResponse) => self.postMessage(response)
  try {
    const outcome = search(query, statesExpanded => post({ id, type: 'progress', statesExpanded }))
    post({ id, type: 'done', outcome })
  } catch (e) {
    post({ id, type: 'error', message: e instanceof Error ? e.message : String(e) })
  }
}
