import { useEffect, useState } from 'react'

/** Hash routes like "#/simulator?product=OG%20Kush", so the app works as static files anywhere. */
export type Page = 'finder' | 'advisor' | 'simulator' | 'stock'
const PAGES: Page[] = ['finder', 'advisor', 'simulator', 'stock']

export interface Route {
  page: Page
  params: URLSearchParams
}

export function parseRoute(hash = window.location.hash): Route {
  const [path, query = ''] = hash.replace(/^#\/?/, '').split('?')
  const page = PAGES.includes(path as Page) ? (path as Page) : 'finder'
  return { page, params: new URLSearchParams(query) }
}

export function routeHref(page: Page, params?: Record<string, string>): string {
  const query = params ? new URLSearchParams(params).toString() : ''
  return `#/${page}${query ? `?${query}` : ''}`
}

/** Updates the current page's parameters without adding a history entry. */
export function replaceParams(page: Page, params: Record<string, string>) {
  history.replaceState(null, '', routeHref(page, params))
}

export function useRoute(): Route {
  const [route, setRoute] = useState(parseRoute)
  useEffect(() => {
    const onChange = () => setRoute(parseRoute())
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])
  return route
}
