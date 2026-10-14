import { getPenWidth, getStrokeWidth } from './boardSpec'
import { measureText } from './textMetrics'
import type { Bounds, Point, Shape, StrokeShape } from './types'

// Shapes are immutable, so a shape object's bounds never change. Text is the
// exception (its width depends on when the font loaded), so it is not cached.
const boundsCache = new WeakMap<Shape, Bounds>()

function pointsBounds(points: Point[], padding: number): Bounds {
  const xs = points.map((p) => p.x)
  const ys = points.map((p) => p.y)
  return {
    minX: Math.min(...xs) - padding,
    minY: Math.min(...ys) - padding,
    maxX: Math.max(...xs) + padding,
    maxY: Math.max(...ys) + padding,
  }
}

function strokeBounds(shape: StrokeShape): Bounds {
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const [x, y] of shape.points) {
    minX = Math.min(minX, x)
    minY = Math.min(minY, y)
    maxX = Math.max(maxX, x)
    maxY = Math.max(maxY, y)
  }
  const half = getPenWidth(shape) / 2
  return {
    minX: minX - half,
    minY: minY - half,
    maxX: maxX + half,
    maxY: maxY + half,
  }
}

function computeBounds(shape: Shape): Bounds {
  switch (shape.type) {
    case 'stroke':
      return strokeBounds(shape)
    case 'line':
      return pointsBounds(
        [
          { x: shape.x1, y: shape.y1 },
          { x: shape.x2, y: shape.y2 },
        ],
        getStrokeWidth(shape) / 2,
      )
    case 'geo':
      return pointsBounds(
        [
          { x: shape.x, y: shape.y },
          { x: shape.x + shape.w, y: shape.y + shape.h },
        ],
        getStrokeWidth(shape) / 2,
      )
    case 'image':
      return pointsBounds(
        [
          { x: shape.x, y: shape.y },
          { x: shape.x + shape.w, y: shape.y + shape.h },
        ],
        0,
      )
    case 'text': {
      const { w, h } = measureText(shape)
      return {
        minX: shape.x,
        minY: shape.y,
        maxX: shape.x + w,
        maxY: shape.y + h,
      }
    }
  }
}

export function getShapeBounds(shape: Shape): Bounds {
  if (shape.type === 'text') return computeBounds(shape)
  let bounds = boundsCache.get(shape)
  if (!bounds) {
    bounds = computeBounds(shape)
    boundsCache.set(shape, bounds)
  }
  return bounds
}

export function unionBounds(list: Bounds[]): Bounds | null {
  if (list.length === 0) return null
  return {
    minX: Math.min(...list.map((b) => b.minX)),
    minY: Math.min(...list.map((b) => b.minY)),
    maxX: Math.max(...list.map((b) => b.maxX)),
    maxY: Math.max(...list.map((b) => b.maxY)),
  }
}

export function boundsFromCorners(
  ax: number,
  ay: number,
  bx: number,
  by: number,
): Bounds {
  return {
    minX: Math.min(ax, bx),
    minY: Math.min(ay, by),
    maxX: Math.max(ax, bx),
    maxY: Math.max(ay, by),
  }
}

export function isBoundsInside(inner: Bounds, outer: Bounds): boolean {
  return (
    inner.minX >= outer.minX &&
    inner.minY >= outer.minY &&
    inner.maxX <= outer.maxX &&
    inner.maxY <= outer.maxY
  )
}

export function isPointInBounds(
  bounds: Bounds,
  x: number,
  y: number,
  margin = 0,
): boolean {
  return (
    x >= bounds.minX - margin &&
    x <= bounds.maxX + margin &&
    y >= bounds.minY - margin &&
    y <= bounds.maxY + margin
  )
}
