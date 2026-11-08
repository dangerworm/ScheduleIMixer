import type { Effect } from '../engine/data'

/** Dark text on light effect colours, light text on dark ones. */
function textColour(hex: string): string {
  const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255)
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b
  return luminance > 0.5 ? '#1a1a1a' : '#ffffff'
}

interface Props {
  effect: Effect
  variant?: 'normal' | 'new' | 'wanted'
}

export function EffectChip({ effect, variant = 'normal' }: Props) {
  return (
    <span
      className={`effect-chip effect-chip--${variant}`}
      style={{ backgroundColor: effect.colour, color: textColour(effect.colour) }}
      title={`${effect.name} (+${effect.bonus.toFixed(2)})`}
    >
      {effect.name}
    </span>
  )
}
