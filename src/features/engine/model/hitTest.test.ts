import { describe, expect, it } from 'vitest'
import { isInsideHollowGeo } from './hitTest'
import { createGeo, DEFAULT_STYLE } from './shapeFactory'

const box = { x: 0, y: 0, w: 200, h: 100 }

describe('isInsideHollowGeo', () => {
  it('counts the middle of an empty box', () => {
    const empty = {
      ...createGeo('rectangle', box, DEFAULT_STYLE),
      fill: 'none' as const,
    }
    expect(isInsideHollowGeo(empty, 100, 50)).toBe(true)
    expect(isInsideHollowGeo(empty, 300, 50)).toBe(false)
  })

  it('ignores filled shapes, which already hit from inside', () => {
    const filled = {
      ...createGeo('rectangle', box, DEFAULT_STYLE),
      fill: 'solid' as const,
    }
    expect(isInsideHollowGeo(filled, 100, 50)).toBe(false)
  })
})
