import { LINE_HEIGHT } from './boardSpec'
import {
  getBaselineOffset,
  getFontCss,
  getFontPx,
  getShapeLines,
  measureLine,
} from './textMetrics'
import type { TextShape } from './types'

export type RevealPiece = { text: string; x: number; y: number }

export function revealsByWord(shape: TextShape): boolean {
  return (shape.textReveal ?? 'word') === 'word'
}

// A typewriter types letters; every other effect lands word by word.
function splitLine(line: string, byLetter: boolean): string[] {
  if (byLetter) return [...line]
  return line.match(/\S+\s*|\s+/g) ?? []
}

// Each word (or letter) placed exactly where the whole line draws it, so
// when the reveal ends and the plain text takes over nothing shifts.
export function getRevealPieces(shape: TextShape): RevealPiece[] {
  const byLetter = shape.textAnimation === 'typewriter'
  const fontCss = getFontCss(shape)
  const lineBox = getFontPx(shape) * LINE_HEIGHT
  const baseline = getBaselineOffset(shape)
  return getShapeLines(shape).flatMap((line, row) => {
    let before = ''
    return splitLine(line, byLetter).flatMap((text) => {
      const x = shape.x + measureLine(before, fontCss)
      before += text
      if (text.trim() === '') return []
      return [{ text, x, y: shape.y + row * lineBox + baseline }]
    })
  })
}
