import { describe, expect, it } from 'vitest'
import { computeSnap } from './snapGuides'
import type { Bounds } from './types'

describe('computeSnap', () => {
  it('returns zero delta and no guides when targets list is empty', () => {
    const moving: Bounds = { minX: 100, minY: 100, maxX: 200, maxY: 200 }
    const result = computeSnap(moving, [])
    expect(result.dx).toBe(0)
    expect(result.dy).toBe(0)
    expect(result.guides).toHaveLength(0)
  })

  it('snaps left edge to target left edge within threshold', () => {
    const moving: Bounds = { minX: 104, minY: 100, maxX: 204, maxY: 200 }
    const target: Bounds = { minX: 100, minY: 300, maxX: 200, maxY: 400 }

    const result = computeSnap(moving, [target], 8)
    expect(result.dx).toBe(-4) // snaps 104 -> 100
    expect(result.guides.some((g) => g.type === 'x' && g.x === 100)).toBe(true)
  })

  it('snaps center to target center', () => {
    // target width is 100 (100 to 200, center is 150)
    const target: Bounds = { minX: 100, minY: 300, maxX: 200, maxY: 400 }
    // moving width is 80 (113 to 193, center is 153)
    const moving: Bounds = { minX: 113, minY: 100, maxX: 193, maxY: 200 }

    const result = computeSnap(moving, [target], 6)
    expect(result.dx).toBe(-3) // snaps 153 -> 150
    expect(result.guides.some((g) => g.type === 'x' && g.x === 150)).toBe(true)
  })

  it('does not snap when distance exceeds threshold', () => {
    const moving: Bounds = { minX: 120, minY: 100, maxX: 220, maxY: 200 }
    const target: Bounds = { minX: 100, minY: 300, maxX: 200, maxY: 400 }

    const result = computeSnap(moving, [target], 8)
    expect(result.dx).toBe(0)
    expect(result.guides).toHaveLength(0)
  })
})
