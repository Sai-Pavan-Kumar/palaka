import { getOutline } from './geoOutline'
import { getRotation, getRotationCentre, toShapeFrame } from './geometry'
import { rotatePoint } from './rotation'
import { getTableBox } from './tableBox'
import type { Point, Shape } from './types'

// What a connector can glue to, seen from the board: every point here already
// includes the target's rotation.
export type BindableShape = Extract<
  Shape,
  { type: 'block' | 'geo' | 'image' | 'table' }
>

const BINDABLE_TYPES = new Set<Shape['type']>([
  'block',
  'geo',
  'image',
  'table',
])

export function isBindable(shape: Shape | undefined): shape is BindableShape {
  return !!shape && BINDABLE_TYPES.has(shape.type)
}

// Tables are measured, every other bindable shape stores its box.
export function boxOf(shape: BindableShape) {
  return shape.type === 'table' ? getTableBox(shape) : shape
}

export function toBoard(shape: BindableShape, point: Point): Point {
  return rotatePoint(point, getRotationCentre(shape), getRotation(shape))
}

export function centreOf(shape: BindableShape): Point {
  const { x, y, w, h } = boxOf(shape)
  return toBoard(shape, { x: x + w / 2, y: y + h / 2 })
}

export function anchorPoint(shape: BindableShape, anchor: Point): Point {
  const { x, y, w, h } = boxOf(shape)
  return toBoard(shape, { x: x + anchor.x * w, y: y + anchor.y * h })
}

export function outlineOf(shape: BindableShape): Point[] {
  if (shape.type !== 'image') {
    return getOutline(shape).map((point) => toBoard(shape, point))
  }
  const { x, y, w, h } = shape
  return [
    { x, y },
    { x: x + w, y },
    { x: x + w, y: y + h },
    { x, y: y + h },
  ].map((point) => toBoard(shape, point))
}

// How far outside a box (in its own units) the point is; 0 when inside.
export function distanceOutside(target: BindableShape, point: Point): number {
  const box = boxOf(target)
  const local = toShapeFrame(target, point)
  const dx = Math.max(box.x - local.x, 0, local.x - (box.x + box.w))
  const dy = Math.max(box.y - local.y, 0, local.y - (box.y + box.h))
  return Math.hypot(dx, dy)
}
