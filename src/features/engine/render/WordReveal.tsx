import type { CSSProperties } from 'react'
import { FONT_FAMILY, FONT_WEIGHT, fontSpacingStyle } from '../model/boardSpec'
import { getFontPx } from '../model/textMetrics'
import { getRevealPieces, getWritingSteps } from '../model/textReveal'
import type { RevealPiece, WritingStep } from '../model/textReveal'
import type { TextShape } from '../model/types'
import { drawMaskId } from './drawOnPlan'
import { useBoardPalette } from './paletteContext'
import { getGlyphStrokes } from './penStrokes'
import { PenMask } from './StrokeWriting'

// How long one word takes to land; the next starts before it finishes, so
// the sentence flows instead of ticking.
const WORD_S = 0.45
const LETTER_S = 0.02

function getEvenSteps(
  pieces: RevealPiece[],
  each: number,
  duration: number,
): WritingStep[] {
  const gap = (duration - each) / Math.max(pieces.length - 1, 1)
  return pieces.map((_, index) => ({ delay: index * gap, duration: each }))
}

function getCssMotion(shape: TextShape, step: WritingStep) {
  return {
    className: `word-in word-in-${shape.textAnimation ?? 'wipe'}`,
    style: {
      ...fontSpacingStyle(shape.font),
      animationDuration: `${step.duration}s`,
      animationDelay: `${step.delay}s`,
    } as CSSProperties,
  }
}

function RevealedPiece({
  shape,
  piece,
  step,
  index,
}: {
  shape: TextShape
  piece: RevealPiece
  step: WritingStep
  index: number
}) {
  const palette = useBoardPalette()
  const animation = shape.textAnimation ?? 'wipe'
  const fontPx = getFontPx(shape)
  const glyph =
    animation === 'wipe' ? getGlyphStrokes(piece.text, shape.font) : null
  const maskId = `${drawMaskId(shape)}-pen-${index}`
  const motion = glyph ? { mask: `url(#${maskId})` } : getCssMotion(shape, step)
  return (
    <>
      {glyph && (
        <PenMask
          id={maskId}
          glyph={glyph}
          fontPx={fontPx}
          x={piece.x}
          y={piece.y}
          step={step}
        />
      )}
      <text
        {...motion}
        x={piece.x}
        y={piece.y}
        fill={palette.ink[shape.color]}
        fontFamily={FONT_FAMILY[shape.font]}
        fontWeight={FONT_WEIGHT[shape.font]}
        fontSize={fontPx}
        xmlSpace="preserve"
      >
        {piece.text}
      </text>
    </>
  )
}

// Each piece is its own <text>: SVG cannot move, blur or clip a tspan, and
// the effects need exactly that. Pieces sit where the whole line draws them.
export function WordReveal({
  shape,
  duration,
}: {
  shape: TextShape
  duration: number
}) {
  const pieces = getRevealPieces(shape)
  const animation = shape.textAnimation ?? 'wipe'
  const each = Math.min(
    animation === 'typewriter' ? LETTER_S : WORD_S,
    duration,
  )
  const steps =
    animation === 'wipe'
      ? getWritingSteps(pieces, getFontPx(shape), duration)
      : getEvenSteps(pieces, each, duration)
  return pieces.map((piece, index) => (
    <RevealedPiece
      key={index}
      shape={shape}
      piece={piece}
      step={steps[index]}
      index={index}
    />
  ))
}
