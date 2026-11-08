import { effects } from '../engine/data'
import { EffectChip } from './EffectChip'

export type Want = 'include' | 'exclude'

const pickable = effects.filter(e => e.obtainable)

/** Click an effect to want it, again to rule it out, and again to clear it. */
export function WantedEffectsPicker({ value, onChange }: { value: Map<number, Want>; onChange: (value: Map<number, Want>) => void }) {
  const cycle = (index: number) => {
    const next = new Map(value)
    const current = value.get(index)
    if (current === undefined) next.set(index, 'include')
    else if (current === 'include') next.set(index, 'exclude')
    else next.delete(index)
    onChange(next)
  }
  return (
    <div className="effect-picker">
      {pickable.map(e => {
        const want = value.get(e.index)
        return (
          <button
            key={e.index}
            className={`effect-picker__option effect-picker__option--${want ?? 'none'}`}
            onClick={() => cycle(e.index)}
            aria-label={`${e.name}: ${want === 'include' ? 'wanted' : want === 'exclude' ? 'not wanted' : 'either'}`}
          >
            <EffectChip effect={e} />
            {want === 'include' && <span className="effect-picker__mark">✓</span>}
            {want === 'exclude' && <span className="effect-picker__mark">✕</span>}
          </button>
        )
      })}
    </div>
  )
}

/** Click effects on or off, up to `max`. */
export function EffectSetPicker({ value, onChange, max }: { value: Set<number>; onChange: (value: Set<number>) => void; max: number }) {
  const toggle = (index: number) => {
    const next = new Set(value)
    if (next.has(index)) next.delete(index)
    else if (next.size < max) next.add(index)
    onChange(next)
  }
  return (
    <div className="effect-picker">
      {pickable.map(e => (
        <button
          key={e.index}
          className={`effect-picker__option effect-picker__option--${value.has(e.index) ? 'include' : 'none'}`}
          onClick={() => toggle(e.index)}
          aria-pressed={value.has(e.index)}
        >
          <EffectChip effect={e} />
        </button>
      ))}
    </div>
  )
}
