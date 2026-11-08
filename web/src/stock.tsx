import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { ingredients, products } from './engine/data'

/**
 * Which products and ingredients the player has access to, saved in the browser. Stored as the
 * names they *don't* have, so anything added to the data later starts out available.
 */
interface Missing {
  products: string[]
  ingredients: string[]
}

const STORAGE_KEY = 'schedule1-mixer.stock'

function load(): Missing {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null')
    if (saved && Array.isArray(saved.products) && Array.isArray(saved.ingredients)) return saved
  } catch {
    // Unavailable or corrupt storage: everything available.
  }
  return { products: [], ingredients: [] }
}

interface Stock {
  /** Indices of available products and ingredients. */
  products: number[]
  ingredients: number[]
  hasProduct: (index: number) => boolean
  hasIngredient: (index: number) => boolean
  setProducts: (indices: number[], available: boolean) => void
  setIngredients: (indices: number[], available: boolean) => void
}

const StockContext = createContext<Stock | null>(null)

export function StockProvider({ children }: { children: ReactNode }) {
  const [missing, setMissing] = useState(load)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(missing))
    } catch {
      // Not persisted; still works for this visit.
    }
  }, [missing])

  const update = useCallback((kind: keyof Missing, names: string[], available: boolean) => {
    setMissing(m => {
      const set = new Set(m[kind])
      for (const name of names) {
        if (available) set.delete(name)
        else set.add(name)
      }
      return { ...m, [kind]: [...set] }
    })
  }, [])

  const stock = useMemo<Stock>(() => {
    const hasProduct = (i: number) => !missing.products.includes(products[i].name)
    const hasIngredient = (i: number) => !missing.ingredients.includes(ingredients[i].name)
    return {
      products: products.filter(p => hasProduct(p.index)).map(p => p.index),
      ingredients: ingredients.filter(i => hasIngredient(i.index)).map(i => i.index),
      hasProduct,
      hasIngredient,
      setProducts: (indices, available) => update('products', indices.map(i => products[i].name), available),
      setIngredients: (indices, available) => update('ingredients', indices.map(i => ingredients[i].name), available),
    }
  }, [missing, update])

  return <StockContext.Provider value={stock}>{children}</StockContext.Provider>
}

export function useStock(): Stock {
  const stock = useContext(StockContext)
  if (!stock) throw new Error('useStock must be used inside StockProvider')
  return stock
}
