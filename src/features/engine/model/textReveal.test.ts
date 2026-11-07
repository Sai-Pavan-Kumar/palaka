import { describe, expect, it } from 'vitest'
import { createText, DEFAULT_STYLE } from './shapeFactory'
import { getRevealPieces, getWritingSteps } from './textReveal'

// No canvas in tests: every character measures 10 units wide. Code has no
// extra spacing, which keeps the expected positions readable.
const shape = (text: string, extra = {}) => ({
  ...createText({ x: 100, y: 0 }, DEFAULT_STYLE),
  font: 'code' as const,
  text,
  ...extra,
})

describe('getWritingSteps', () => {
  const pieces = getRevealPieces(shape('ab c\nd'))
  const steps = getWritingSteps(pieces, 40, 4)

  it('fills the given time, one letter after another', () => {
    const last = steps[steps.length - 1]
    expect(last.delay + last.duration).toBeCloseTo(4)
    steps.slice(1).forEach((step, index) => {
      const previous = steps[index]
      expect(step.delay).toBeGreaterThanOrEqual(
        previous.delay + previous.duration - 1e-9,
      )
    })
  })

  it('lifts the pen longer between lines than between words', () => {
    const gapBefore = (index: number) =>
      steps[index].delay - steps[index - 1].delay - steps[index - 1].duration
    expect(gapBefore(1)).toBeCloseTo(0)
    expect(gapBefore(2)).toBeGreaterThan(0)
    expect(gapBefore(3)).toBeGreaterThan(gapBefore(2))
  })
})

describe('getRevealPieces', () => {
  it('places handwriting letters with the board spacing included', () => {
    const pieces = getRevealPieces({
      ...createText({ x: 0, y: 0 }, { ...DEFAULT_STYLE, size: 's' }),
      text: 'a b',
    })
    // 'a ' is 20 wide; 32px type takes off 2 letter gaps and 1 word gap.
    expect(pieces[1].x).toBeCloseTo(20 + 32 * (2 * -0.025 - 0.1))
  })

  it('splits into words placed where the line draws them', () => {
    const pieces = getRevealPieces(
      shape('ab cd\nef', { textAnimation: 'slide-up' }),
    )
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
    const pieces = getRevealPieces(
      shape('aaa bbb', { wrapWidth: 40, textAnimation: 'slide-up' }),
    )
    expect(pieces[1].x).toBe(100)
    expect(pieces[1].y).toBeGreaterThan(pieces[0].y)
  })
})
