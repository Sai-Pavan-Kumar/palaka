import { describe, expect, it } from 'vitest'
import {
  getLineControlPoint,
  getLineEndPointTangent,
  getLineMidpoint,
  getLinePath,
  getLineSamplePoints,
} from './lineRouting'
import type { LineShape } from './types'

function makeLine(
  routing?: 'straight' | 'elbow' | 'curved',
  x2 = 200,
  y2 = 100,
): LineShape {
  return {
    id: 'test-line',
    type: 'line',
    x1: 0,
    y1: 0,
    x2,
    y2,
    routing,
    arrowhead: true,
    color: 'black',
    opacity: 1,
    size: 'm',
    dash: 'clean',
  }
}

describe('lineRouting', () => {
  it('computes straight line path, tangent, midpoint, and sample points', () => {
    const line = makeLine('straight', 200, 0)
    expect(getLinePath(line)).toBe('M0,0 L200,0')

    const tangent = getLineEndPointTangent(line)
    expect(tangent.tip).toEqual({ x: 200, y: 0 })
    expect(tangent.angle).toBe(0)

    const mid = getLineMidpoint(line)
    expect(mid).toEqual({ x: 100, y: 0 })

    const samples = getLineSamplePoints(line)
    expect(samples).toHaveLength(2)
    expect(samples[0]).toEqual({ x: 0, y: 0 })
    expect(samples[1]).toEqual({ x: 200, y: 0 })
  })

  it('computes elbow line path with horizontal-first step and rounded corners', () => {
    const line = makeLine('elbow', 200, 100)
    const path = getLinePath(line)
    expect(path).toContain('Q') // Rounded fillet
    expect(path.startsWith('M0,0')).toBe(true)
    expect(path.endsWith('L200,100')).toBe(true)

    const tangent = getLineEndPointTangent(line)
    expect(tangent.tip).toEqual({ x: 200, y: 100 })
    expect(tangent.angle).toBe(0) // Approaches along horizontal

    const samples = getLineSamplePoints(line)
    expect(samples).toHaveLength(4)
    expect(samples[1]).toEqual({ x: 100, y: 0 })
    expect(samples[2]).toEqual({ x: 100, y: 100 })
  })

  it('computes curved line path with control point bow', () => {
    const line = makeLine('curved', 200, 0)
    const cp = getLineControlPoint(line)
    expect(cp.x).toBe(100)
    expect(cp.y).toBe(40) // Bends perpendicular to line in SVG coordinates

    const path = getLinePath(line)
    expect(path.startsWith('M0,0 Q100,')).toBe(true)
    expect(path.endsWith(' 200,0')).toBe(true)

    const samples = getLineSamplePoints(line)
    expect(samples).toHaveLength(5)
    expect(samples[0]).toEqual({ x: 0, y: 0 })
    expect(samples[4]).toEqual({ x: 200, y: 0 })
  })
})
