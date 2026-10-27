import type { CSSProperties } from 'react'
import { FONT_FAMILY, FONT_WEIGHT } from '../model/boardSpec'
import { getFontPx } from '../model/textMetrics'
import { getRevealPieces } from '../model/textReveal'
import type { TextShape } from '../model/types'
import { useBoardPalette } from './paletteContext'

// How long one word takes to land; the next starts before it finishes, so
// the sentence flows instead of ticking.
const WORD_S = 0.45
const LETTER_S = 0.02

// Each word is its own <text>: SVG cannot move, blur or fade a tspan, and
// the effects need exactly that. Pieces sit where the whole line draws them.
export function WordReveal({
  shape,
  duration,
}: {
  shape: TextShape
  duration: number
}) {
  const palette = useBoardPalette()
  const pieces = getRevealPieces(shape)
  const animation = shape.textAnimation ?? 'wipe'
  const each = Math.min(
    animation === 'typewriter' ? LETTER_S : WORD_S,
    duration,
  )
  const gap = (duration - each) / Math.max(pieces.length - 1, 1)
  return pieces.map((piece, index) => (
    <text
      key={index}
      className={`word-in word-in-${animation}`}
      style={
        {
          animationDuration: `${each}s`,
          animationDelay: `${index * gap}s`,
        } as CSSProperties
      }
      x={piece.x}
      y={piece.y}
      fill={palette.ink[shape.color]}
      fontFamily={FONT_FAMILY[shape.font]}
      fontWeight={FONT_WEIGHT[shape.font]}
      fontSize={getFontPx(shape)}
      xmlSpace="preserve"
    >
      {piece.text}
    </text>
  ))
}
