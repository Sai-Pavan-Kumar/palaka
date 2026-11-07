import { describe, expect, it } from 'vitest'
import { extractGlyphStrokes, type InkGrid } from './glyphStrokes'

const SIZE = 60

function gridWith(...rects: [number, number, number, number][]): InkGrid {
  const ink = new Uint8Array(SIZE * SIZE)
  for (const [left, top, right, bottom] of rects) {
    for (let y = top; y <= bottom; y++) {
      for (let x = left; x <= right; x++) ink[y * SIZE + x] = 1
    }
  }
  return { ink, width: SIZE, height: SIZE }
}

describe('extractGlyphStrokes', () => {
  it('writes a stem from the top down', () => {
    const { strokes } = extractGlyphStrokes(gridWith([28, 10, 31, 50]))
    expect(strokes).toHaveLength(1)
    const stem = strokes[0]
    expect(stem[0].y).toBeLessThan(stem[stem.length - 1].y)
  })

  it('writes the stem of an n down, then returns to the top for the arch', () => {
    const { strokes } = extractGlyphStrokes(
      gridWith([15, 15, 18, 50], [15, 15, 42, 18], [39, 15, 42, 50]),
    )
    expect(strokes).toHaveLength(2)
    for (const stroke of strokes) {
      expect(stroke[0].y).toBeLessThan(25)
      expect(stroke[stroke.length - 1].y).toBeGreaterThan(40)
    }
  })

  it('keeps a separate dot as its own stroke', () => {
    const { strokes } = extractGlyphStrokes(
      gridWith([28, 8, 30, 10], [28, 20, 31, 50]),
    )
    expect(strokes).toHaveLength(2)
    expect(strokes[0][0].y).toBeLessThan(12)
  })

  it('makes the pen wide enough to cover the thickest part', () => {
    const { penRadius } = extractGlyphStrokes(gridWith([20, 10, 31, 50]))
    expect(penRadius * 2).toBeGreaterThanOrEqual(12)
  })
})
