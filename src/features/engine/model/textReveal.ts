import { getLineHeight } from './boardSpec'
import {
  getBaselineOffset,
  getFontPx,
  getShapeLines,
  measureFontLine,
} from './textMetrics'
import type { TextAnimation, TextShape } from './types'

export type RevealPiece = {
  text: string
  x: number
  y: number
  width: number
  // How long the hand stops before this piece, in letter-times.
  pauseBefore: number
}

export type WritingStep = { delay: number; duration: number }

const WORD_PAUSE = 1.6
const LINE_PAUSE = 3.5
// A hand never moves at one speed. Fixed offsets, not random ones, so a replay
// and a re-render write at exactly the same rhythm.
const HAND_RHYTHM = [1, 0.82, 1.14, 0.93, 1.22, 0.88, 1.06]
const NARROW_LETTER_MIN = 0.55

export function revealsByWord(shape: TextShape): boolean {
  return (shape.textReveal ?? 'word') === 'word'
}

// Handwriting and the typewriter work letter by letter.
export function revealsByLetter(animation: TextAnimation = 'wipe'): boolean {
  return animation === 'wipe' || animation === 'typewriter'
}

const graphemes = new Intl.Segmenter(undefined, { granularity: 'grapheme' })

// Whole graphemes: splitting a Telugu conjunct into code points would draw
// broken letters while the pen moves.
function splitLine(line: string, byLetter: boolean): string[] {
  if (byLetter) return [...graphemes.segment(line)].map((part) => part.segment)
  return line.match(/\S+\s*|\s+/g) ?? []
}

// Each word (or letter) placed exactly where the whole line draws it, so
// when the reveal ends and the plain text takes over nothing shifts.
export function getRevealPieces(shape: TextShape): RevealPiece[] {
  const byLetter = revealsByLetter(shape.textAnimation)
  const lineBox = getFontPx(shape) * getLineHeight(shape.font)
  const baseline = getBaselineOffset(shape)
  return getShapeLines(shape).flatMap((line, row) => {
    let before = ''
    let pauseBefore = row === 0 ? 0 : LINE_PAUSE
    return splitLine(line, byLetter).flatMap((text) => {
      const x = shape.x + measureFontLine(before, shape)
      before += text
      if (text.trim() === '') {
        pauseBefore = Math.max(pauseBefore, WORD_PAUSE)
        return []
      }
      const piece = {
        text,
        x,
        y: shape.y + row * lineBox + baseline,
        width: measureFontLine(text, shape),
        pauseBefore,
      }
      pauseBefore = 0
      return [piece]
    })
  })
}

// Turns pieces into a hand's timing: wide letters take longer, the pen lifts
// between words, and it travels back between lines. Fills `totalSeconds`.
export function getWritingSteps(
  pieces: RevealPiece[],
  fontPx: number,
  totalSeconds: number,
): WritingStep[] {
  const strokes = pieces.map((piece, index) => {
    const size = Math.max(NARROW_LETTER_MIN, piece.width / (fontPx * 0.5))
    return size * HAND_RHYTHM[index % HAND_RHYTHM.length]
  })
  const totalUnits = pieces.reduce(
    (sum, piece, index) => sum + piece.pauseBefore + strokes[index],
    0,
  )
  const secondsPerUnit = totalUnits > 0 ? totalSeconds / totalUnits : 0
  let elapsed = 0
  return pieces.map((piece, index) => {
    const delay = elapsed + piece.pauseBefore
    elapsed = delay + strokes[index]
    return {
      delay: delay * secondsPerUnit,
      duration: strokes[index] * secondsPerUnit,
    }
  })
}
