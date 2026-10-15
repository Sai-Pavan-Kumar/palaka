import { getPenWidth, getStrokeWidth } from './boardSpec'
import { getOutline } from './geoOutline'
import { getShapeBounds, isPointInBounds } from './geometry'
import { getLineSamplePoints } from './lineRouting'
import type { Point, Shape } from './types'

function distanceToSegment(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const lengthSquared = dx * dx + dy * dy
  const projection =
    lengthSquared === 0
      ? 0
      : ((p.x - a.x) * dx + (p.y - a.y) * dy) / lengthSquared
  const t = Math.max(0, Math.min(1, projection))
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy))
}

function isNearPolyline(
  p: Point,
  points: Point[],
  reach: number,
  closed: boolean,
): boolean {
  if (points.length === 1) {
    return Math.hypot(p.x - points[0].x, p.y - points[0].y) <= reach
  }
  const last = closed ? points.length : points.length - 1
  for (let i = 0; i < last; i++) {
    const next = points[(i + 1) % points.length]
    if (distanceToSegment(p, points[i], next) <= reach) return true
  }
  return false
}

// Even-odd ray casting: count edge crossings to the right of the point.
function isInsidePolygon(p: Point, polygon: Point[]): boolean {
  let inside = false
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i]
    const b = polygon[j]
    const crosses =
      a.y > p.y !== b.y > p.y &&
      p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x
    if (crosses) inside = !inside
  }
  return inside
}

// "On the ink" means within half the line width plus a tolerance, so thin
// lines stay easy to grab. Filled shapes, text and images are solid: a click
// anywhere inside counts.
export function hitTestShape(
  shape: Shape,
  x: number,
  y: number,
  tolerance: number,
): boolean {
  if (!isPointInBounds(getShapeBounds(shape), x, y, tolerance)) return false
  const p = { x, y }
  switch (shape.type) {
    case 'stroke': {
      const points = shape.points.map(([px, py]) => ({ x: px, y: py }))
      return isNearPolyline(
        p,
        points,
        getPenWidth(shape) / 2 + tolerance,
        false,
      )
    }
    case 'line': {
      const points = getLineSamplePoints(shape)
      return isNearPolyline(
        p,
        points,
        getStrokeWidth(shape) / 2 + tolerance,
        false,
      )
    }
    case 'geo': {
      const outline = getOutline(shape)
      if (shape.fill !== 'none' && isInsidePolygon(p, outline)) return true
      return isNearPolyline(
        p,
        outline,
        getStrokeWidth(shape) / 2 + tolerance,
        true,
      )
    }
    // A block carries an icon and a label, so it is grabbed like a card.
    case 'highlight':
    case 'tableState':
      return false
    case 'block':
    case 'table':
    case 'text':
    case 'image':
      return true
  }
}
