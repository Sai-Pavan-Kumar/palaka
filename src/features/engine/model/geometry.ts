import { getPenWidth, getStrokeWidth } from './boardSpec'
import { getTableBox } from './tableBox'
import { getLineSamplePoints } from './lineRouting'
import { rotatePoint } from './rotation'
import { measureText } from './textMetrics'
import type { Bounds, Point, Shape, StrokeShape } from './types'

// Shapes are immutable, so a shape object's bounds never change. Text is the
// exception (its width depends on when the font loaded), so it is not cached.
const boundsCache = new WeakMap<Shape, Bounds>()

const OFF_BOARD: Bounds = { minX: -1e7, minY: -1e7, maxX: -1e7, maxY: -1e7 }

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

function boxBounds(
  box: { x: number; y: number; w: number; h: number },
  padding: number,
): Bounds {
  return {
    minX: box.x - padding,
    minY: box.y - padding,
    maxX: box.x + box.w + padding,
    maxY: box.y + box.h + padding,
  }
}

function computeBounds(shape: Shape): Bounds {
  switch (shape.type) {
    case 'stroke':
      return strokeBounds(shape)
    case 'line':
      return pointsBounds(getLineSamplePoints(shape), getStrokeWidth(shape) / 2)
    case 'geo':
    case 'block':
      return boxBounds(shape, getStrokeWidth(shape) / 2)
    case 'image':
      return boxBounds(shape, 0)
    case 'table':
      return boxBounds(getTableBox(shape), getStrokeWidth(shape) / 2)
    // Effects have no ink; far off the slide, no marquee ever contains them.
    case 'highlight':
    case 'tableState':
      return OFF_BOARD
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

export function getRotation(shape: Shape): number {
  return shape.rotation ?? 0
}

export function getBoundsCentre(bounds: Bounds): Point {
  return {
    x: (bounds.minX + bounds.maxX) / 2,
    y: (bounds.minY + bounds.maxY) / 2,
  }
}

export function getRotationCentre(shape: Shape): Point {
  return getBoundsCentre(getLocalBounds(shape))
}

// A board point in the shape's own unrotated frame, where its x, y, w and h
// mean what they say.
export function toShapeFrame(shape: Shape, point: Point): Point {
  const rotation = getRotation(shape)
  if (rotation === 0) return point
  return rotatePoint(point, getRotationCentre(shape), -rotation)
}

// What the shape covers on the board, for snapping, marquee and spotlight.
export function getShapeBounds(shape: Shape): Bounds {
  const local = getLocalBounds(shape)
  const rotation = getRotation(shape)
  if (rotation === 0) return local
  const centre = getBoundsCentre(local)
  const corners = [
    { x: local.minX, y: local.minY },
    { x: local.maxX, y: local.minY },
    { x: local.maxX, y: local.maxY },
    { x: local.minX, y: local.maxY },
  ].map((corner) => rotatePoint(corner, centre, rotation))
  return pointsBounds(corners, 0)
}

// The box before rotation: the frame a rotated shape draws and resizes in.
export function getLocalBounds(shape: Shape): Bounds {
  // Text and tables are measured, and widths change once the fonts load.
  if (shape.type === 'text' || shape.type === 'table') {
    return computeBounds(shape)
  }
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
