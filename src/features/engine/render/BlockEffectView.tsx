import type { BlockShape } from '../model/types'
import { useBoardPalette } from './paletteContext'
import './blockEffect.css'

export function BlockEffectView({ shape }: { shape: BlockShape }) {
  const palette = useBoardPalette()
  const effect = shape.effect ?? 'none'
  if (effect === 'none') return null

  const color = palette.ink[shape.color]
  const rx = Math.min(14, Math.min(shape.w, shape.h) * 0.15)

  return (
    <rect
      x={shape.x}
      y={shape.y}
      width={shape.w}
      height={shape.h}
      rx={rx}
      fill="none"
      stroke={color}
      className={`block-effect--${effect}`}
      aria-hidden
    />
  )
}
