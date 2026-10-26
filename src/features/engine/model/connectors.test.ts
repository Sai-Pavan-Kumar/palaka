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
