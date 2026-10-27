import { describe, expect, it } from 'vitest'
import { createText, DEFAULT_STYLE } from './shapeFactory'
import { fitTextToBoard, textAreaFor } from './textFit'
import { getShapeLines, measureText } from './textMetrics'
import type { TextShape } from './types'

// No canvas in tests: every character measures 10 units wide.
function text(value: string, extra: Partial<TextShape> = {}): TextShape {
  return {
    ...createText({ x: 100, y: 100 }, DEFAULT_STYLE),
    text: value,
    ...extra,
  }
}

describe('getShapeLines', () => {
  it('wraps word by word and keeps typed breaks', () => {
    const shape = text('aaa bbb ccc\nddd', { wrapWidth: 75 })
    expect(getShapeLines(shape)).toEqual(['aaa bbb ', 'ccc', 'ddd'])
  })

  it('breaks one word that is wider than the line', () => {
    const shape = text('abcdefghij', { wrapWidth: 40 })
    expect(getShapeLines(shape)).toEqual(['abcd', 'efgh', 'ij'])
  })

  it('leaves text without a wrap width alone', () => {
    expect(getShapeLines(text('one very long line'))).toEqual([
      'one very long line',
    ])
  })
})

describe('textAreaFor', () => {
  it('keeps a margin inside the frame the text starts in', () => {
    expect(textAreaFor(100, '16:9', 1)).toEqual({ right: 1872, bottom: 1032 })
    expect(textAreaFor(2000, '16:9', 2)).toEqual({ right: 3792, bottom: 1032 })
  })
})

describe('fitTextToBoard', () => {
  const area = { right: 400, bottom: 400 }

  it('wraps typed text at the right edge so it never runs off', () => {
    const fitted = fitTextToBoard(text('word '.repeat(20)), area)
    expect(fitted.wrapWidth).toBe(300)
    expect(fitted.x + measureText(fitted).w).toBeLessThanOrEqual(area.right)
  })

  it('shrinks text that would run past the bottom, but not below half', () => {
    const long = fitTextToBoard(text('word '.repeat(40)), area)
    expect(long.scale).toBeLessThan(1)
    expect(long.y + measureText(long).h).toBeLessThanOrEqual(area.bottom)
    const huge = fitTextToBoard(text('word '.repeat(2000)), area)
    expect(huge.scale).toBeGreaterThanOrEqual(0.5)
  })

  it('never wraps a code card; it shrinks it instead', () => {
    const card = text('x'.repeat(40), { codeCall: '', font: 'code' })
    const fitted = fitTextToBoard(card, area)
    expect(fitted.wrapWidth).toBeUndefined()
    expect(getShapeLines(fitted)).toHaveLength(1)
    expect(fitted.scale).toBeLessThan(1)
  })
})

describe('resizing wrapped text', () => {
  it('keeps the same line breaks when the box is scaled', async () => {
    const { scaleShape } = await import('./transform')
    const shape = text('aaa bbb ccc ddd', { wrapWidth: 75 })
    const bigger = scaleShape(shape, {
      originX: 0,
      originY: 0,
      scaleX: 2,
      scaleY: 2,
    }) as TextShape
    expect(bigger.scale).toBe(2)
    expect(bigger.wrapWidth).toBe(150)
  })
})
