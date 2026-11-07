import type { CSSProperties } from 'react'
import { getStrokeLength, type GlyphStrokes } from '../model/glyphStrokes'
import type { WritingStep } from '../model/textReveal'
import {
  BASELINE_Y,
  getStrokeSteps,
  GLYPH_H,
  GLYPH_W,
  ORIGIN_X,
  RASTER_PX,
  toPathData,
} from './penStrokes'

type Props = {
  id: string
  glyph: GlyphStrokes
  fontPx: number
  x: number
  y: number
  step: WritingStep
}

// A thick pen path grows inside a mask and uncovers the real letter, so the
// finished glyph is the font's own shape, pixel for pixel.
export function PenMask({ id, glyph, fontPx, x, y, step }: Props) {
  const scale = fontPx / RASTER_PX
  const left = x - ORIGIN_X * scale
  const top = y - BASELINE_Y * scale
  const steps = getStrokeSteps(glyph.strokes.map(getStrokeLength), step)
  return (
    <mask
      id={id}
      maskUnits="userSpaceOnUse"
      x={left}
      y={top}
      width={GLYPH_W * scale}
      height={GLYPH_H * scale}
    >
      <g transform={`translate(${left} ${top}) scale(${scale})`}>
        {glyph.strokes.map((points, index) => (
          <path
            key={index}
            className="pen-stroke"
            style={
              {
                animationDelay: `${steps[index].delay}s`,
                animationDuration: `${steps[index].duration}s`,
              } as CSSProperties
            }
            d={toPathData(points)}
            pathLength={1}
            fill="none"
            stroke="white"
            strokeWidth={glyph.penRadius * 2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}
      </g>
    </mask>
  )
}
