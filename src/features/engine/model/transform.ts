import { MIN_BLOCK_SIZE } from './blockCatalog'
import { getRotation, getRotationCentre } from './geometry'
import { normalizeDegrees, rotatePoint } from './rotation'
import type { Point, Shape } from './types'

export type ScaleTransform = {
  originX: number
  originY: number
  scaleX: number
  scaleY: number
}

export function translateShape(shape: Shape, dx: number, dy: number): Shape {
  switch (shape.type) {
    case 'highlight':
    case 'tableState':
      return shape
    case 'stroke':
      return {
        ...shape,
        points: shape.points.map(([x, y, p]) => [x + dx, y + dy, p]),
      }
    case 'line':
      return {
        ...shape,
        x1: shape.x1 + dx,
        y1: shape.y1 + dy,
        x2: shape.x2 + dx,
        y2: shape.y2 + dy,
      }
    default:
      return { ...shape, x: shape.x + dx, y: shape.y + dy }
  }
}

function mapX(t: ScaleTransform, x: number) {
  return t.originX + (x - t.originX) * t.scaleX
}

function mapY(t: ScaleTransform, y: number) {
  return t.originY + (y - t.originY) * t.scaleY
}

// A flipped box (dragged past its anchor) is stored un-flipped, so w and h
// are always positive.
function scaleBox<S extends { x: number; y: number; w: number; h: number }>(
  shape: S,
  t: ScaleTransform,
): S {
  const x1 = mapX(t, shape.x)
  const x2 = mapX(t, shape.x + shape.w)
  const y1 = mapY(t, shape.y)
  const y2 = mapY(t, shape.y + shape.h)
  return {
    ...shape,
    x: Math.min(x1, x2),
    y: Math.min(y1, y2),
    w: Math.abs(x2 - x1),
    h: Math.abs(y2 - y1),
  }
}

export function rotateShapeAround(
  shape: Shape,
  pivot: Point,
  degrees: number,
): Shape {
  if (shape.type === 'highlight' || shape.type === 'tableState') return shape
  if (shape.type === 'line') {
    const start = rotatePoint({ x: shape.x1, y: shape.y1 }, pivot, degrees)
    const end = rotatePoint({ x: shape.x2, y: shape.y2 }, pivot, degrees)
    return { ...shape, x1: start.x, y1: start.y, x2: end.x, y2: end.y }
  }
  const centre = getRotationCentre(shape)
  const moved = rotatePoint(centre, pivot, degrees)
  return {
    ...translateShape(shape, moved.x - centre.x, moved.y - centre.y),
    rotation: normalizeDegrees(getRotation(shape) + degrees),
  }
}

// Scaling changes a shape's centre, which is its pivot, so a rotated shape
// would slide. Shifting it back keeps the corner opposite the handle still.
export function scaleKeepingAnchor(shape: Shape, t: ScaleTransform): Shape {
  const rotation = getRotation(shape)
  const anchor = { x: t.originX, y: t.originY }
  const before = rotatePoint(anchor, getRotationCentre(shape), rotation)
  const scaled = scaleShape(shape, t)
  const after = rotatePoint(anchor, getRotationCentre(scaled), rotation)
  return translateShape(scaled, before.x - after.x, before.y - after.y)
}

// In a group, a rotated shape cannot stretch along the group's axes without
// skewing, so its centre follows the group and it grows around that centre.
export function scaleRotatedMember(shape: Shape, t: ScaleTransform): Shape {
  const centre = getRotationCentre(shape)
  const scaled = scaleShape(shape, {
    originX: centre.x,
    originY: centre.y,
    scaleX: Math.abs(t.scaleX),
    scaleY: Math.abs(t.scaleY),
  })
  const after = getRotationCentre(scaled)
  return translateShape(
    scaled,
    mapX(t, centre.x) - after.x,
    mapY(t, centre.y) - after.y,
  )
}

// Ink follows the average stretch, so shrinking a word by half also halves
// its line width instead of leaving a blob. Boxes and lines keep their line
// width, like every drawing tool.
export function scaleShape(shape: Shape, t: ScaleTransform): Shape {
  const inkFactor = Math.sqrt(Math.abs(t.scaleX * t.scaleY))
  switch (shape.type) {
    case 'stroke':
      return {
        ...shape,
        scale: shape.scale * inkFactor,
        points: shape.points.map(([x, y, p]) => [mapX(t, x), mapY(t, y), p]),
      }
    case 'line':
      return {
        ...shape,
        x1: mapX(t, shape.x1),
        y1: mapY(t, shape.y1),
        x2: mapX(t, shape.x2),
        y2: mapY(t, shape.y2),
      }
    case 'table':
      // Text cannot stretch, so it grows by the average and keeps its corner
      // in place relative to the selection.
      return {
        ...shape,
        x: mapX(t, shape.x),
        y: mapY(t, shape.y),
        scale: shape.scale * inkFactor,
      }
    case 'text':
      // The wrap width scales with the letters, so a resize keeps the same
      // line breaks and the whole box grows like a picture, instead of the
      // bigger words re-wrapping inside a box that never widens.
      return {
        ...shape,
        x: mapX(t, shape.x),
        y: mapY(t, shape.y),
        scale: shape.scale * inkFactor,
        ...(shape.wrapWidth && { wrapWidth: shape.wrapWidth * inkFactor }),
      }
    case 'highlight':
    case 'tableState':
      return shape
    case 'geo':
    case 'image':
      return scaleBox(shape, t)
    case 'block': {
      const box = scaleBox(shape, t)
      return {
        ...box,
        w: Math.max(box.w, MIN_BLOCK_SIZE.w),
        h: Math.max(box.h, MIN_BLOCK_SIZE.h),
      }
    }
  }
}
