import { EffectChip } from '../components/EffectChip'
import { effects, ingredients, products } from '../engine/data'
import { useStock } from '../stock'

export function Stock() {
  const stock = useStock()
  const allProducts = products.map(p => p.index)
  const allIngredients = ingredients.map(i => i.index)

  return (
    <div className="stock">
      <p className="hint">
        Tick what you can get hold of. Searches only use these. Your choices are saved in this browser.
      </p>

      <section className="panel">
        <div className="panel__header">
          <h2>Products</h2>
          <button onClick={() => stock.setProducts(allProducts, true)}>All</button>
          <button onClick={() => stock.setProducts(allProducts, false)}>None</button>
        </div>
        <div className="check-grid">
          {products.map(p => (
            <label key={p.index} className="check">
              <input type="checkbox" checked={stock.hasProduct(p.index)} onChange={e => stock.setProducts([p.index], e.target.checked)} />
              <span className="check__name">{p.name}</span>
              {p.baseEffect !== null && <EffectChip effect={effects[p.baseEffect]} />}
            </label>
          ))}
        </div>
      </section>

      <section className="panel">
        <div className="panel__header">
          <h2>Ingredients</h2>
          <button onClick={() => stock.setIngredients(allIngredients, true)}>All</button>
          <button onClick={() => stock.setIngredients(allIngredients, false)}>None</button>
        </div>
        <div className="check-grid">
          {ingredients.map(i => (
            <label key={i.index} className="check">
              <input type="checkbox" checked={stock.hasIngredient(i.index)} onChange={e => stock.setIngredients([i.index], e.target.checked)} />
              <span className="check__name">
                {i.name} <span className="muted">${i.price}</span>
              </span>
              <EffectChip effect={effects[i.baseEffect]} />
              <span className="check__note">{i.rankRequirement ?? 'Available from the start'}</span>
            </label>
          ))}
        </div>
      </section>
    </div>
  )
}
