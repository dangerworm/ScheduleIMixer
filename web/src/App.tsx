import { Advisor } from './pages/Advisor'
import { Finder } from './pages/Finder'
import { Simulator } from './pages/Simulator'
import { Stock } from './pages/Stock'
import { routeHref, useRoute, type Page } from './router'
import { StockProvider } from './stock'

const NAV: { page: Page; label: string }[] = [
  { page: 'finder', label: 'Finder' },
  { page: 'advisor', label: 'Advisor' },
  { page: 'simulator', label: 'Simulator' },
  { page: 'stock', label: 'My stock' },
]

export default function App() {
  const route = useRoute()
  return (
    <StockProvider>
      <header className="app-header">
        <h1>Schedule I Mixer</h1>
        <nav>
          {NAV.map(n => (
            <a key={n.page} href={routeHref(n.page)} className={route.page === n.page ? 'active' : ''}>
              {n.label}
            </a>
          ))}
        </nav>
      </header>
      <main>
        {/* Keyed by the full hash so following a link into the Simulator loads that recipe. */}
        {route.page === 'simulator' && <Simulator key={route.params.toString()} params={route.params} />}
        {route.page === 'finder' && <Finder key={route.params.toString()} params={route.params} />}
        {route.page === 'advisor' && <Advisor />}
        {route.page === 'stock' && <Stock />}
      </main>
    </StockProvider>
  )
}
