import { describe, expect, it } from 'vitest'
import { createText, DEFAULT_STYLE } from './shapeFactory'
import { getRevealPieces } from './textReveal'

// No canvas in tests: every character measures 10 units wide.
const shape = (text: string, extra = {}) => ({
  ...createText({ x: 100, y: 0 }, DEFAULT_STYLE),
  text,
  ...extra,
})

describe('getRevealPieces', () => {
  it('splits into words placed where the line draws them', () => {
    const pieces = getRevealPieces(shape('ab cd\nef'))
    expect(pieces.map((p) => [p.text, p.x])).toEqual([
      ['ab ', 100],
      ['cd', 130],
      ['ef', 100],
    ])
    expect(pieces[2].y).toBeGreaterThan(pieces[0].y)
  })

  it('splits into letters for the typewriter, skipping spaces', () => {
    const pieces = getRevealPieces(
      shape('a b', { textAnimation: 'typewriter' }),
    )
    expect(pieces.map((p) => [p.text, p.x])).toEqual([
      ['a', 100],
      ['b', 120],
    ])
  })

  it('follows wrapped lines', () => {
    const pieces = getRevealPieces(shape('aaa bbb', { wrapWidth: 40 }))
    expect(pieces[1].x).toBe(100)
    expect(pieces[1].y).toBeGreaterThan(pieces[0].y)
  })
})
