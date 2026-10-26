import { describe, expect, it } from 'vitest'
import { bindingAt, routeConnector } from './connectors'
import type { GeoShape, LineShape, Page } from './types'

const box: GeoShape = {
  id: 'box',
  type: 'geo',
  geo: 'rectangle',
  x: 0,
  y: 0,
  w: 200,
  h: 100,
  color: 'black',
  size: 'm',
  fill: 'none',
  dash: 'clean',
  opacity: 1,
}

const line: LineShape = {
  id: 'line',
  type: 'line',
  x1: 500,
  y1: 50,
  x2: 0,
  y2: 0,
  arrowhead: true,
  color: 'black',
  size: 'm',
  dash: 'clean',
  opacity: 1,
}

const page: Page = {
  id: 'p',
  name: 'Page',
  shapes: { box, line },
  order: ['box', 'line'],
}

describe('bindingAt', () => {
  it('keeps centre aiming for a drop near the middle', () => {
    expect(bindingAt(box, { x: 105, y: 52 }).anchor).toBeUndefined()
  })

  it('pins to the dropped spot near an edge', () => {
    expect(bindingAt(box, { x: 30, y: 2 }).anchor).toEqual({
      x: 0.15,
      y: 0.02,
    })
  })

  it('snaps to a side midpoint when close', () => {
    expect(bindingAt(box, { x: 104, y: 3 }).anchor).toEqual({ x: 0.5, y: 0 })
  })
})

describe('routeConnector with a pinned end', () => {
  it('lands on the pinned spot, not the centre edge', () => {
    const pinned = { ...line, endBinding: bindingAt(box, { x: 30, y: 2 }) }
    const routed = routeConnector(page, pinned)
    expect(routed.x2).toBeLessThan(40)
    expect(routed.y2).toBeLessThan(0)
  })

  it('still follows the shape when it moves', () => {
    const pinned = { ...line, endBinding: bindingAt(box, { x: 30, y: 2 }) }
    const moved = {
      ...page,
      shapes: { ...page.shapes, box: { ...box, x: 100 } },
    }
    const routed = routeConnector(moved, pinned)
    expect(routed.x2).toBeGreaterThan(120)
  })
})

describe('routeConnector with elbow and curved routing', () => {
  const right: GeoShape = { ...box, id: 'right', x: 500, y: 300 }
  const both = { ...page, shapes: { box, right }, order: ['box', 'right'] }
  const glued: LineShape = {
    ...line,
    startBinding: { shapeId: 'box' },
    endBinding: { shapeId: 'right' },
  }

  it('elbow leaves the facing side and enters the facing side', () => {
    const routed = routeConnector(both, { ...glued, routing: 'elbow' })
    expect(routed.x1).toBeGreaterThan(box.x + box.w)
    expect(routed.y1).toBe(box.y + box.h / 2)
    expect(routed.x2).toBeLessThan(right.x)
    expect(routed.y2).toBe(right.y + right.h / 2)
  })

  it('curved ends sit on the outlines, not at the centres', () => {
    const routed = routeConnector(both, { ...glued, routing: 'curved' })
    const outside = (x: number, y: number, s: GeoShape) =>
      x <= s.x || x >= s.x + s.w || y <= s.y || y >= s.y + s.h
    expect(outside(routed.x1, routed.y1, box)).toBe(true)
    expect(outside(routed.x2, routed.y2, right)).toBe(true)
  })
})
