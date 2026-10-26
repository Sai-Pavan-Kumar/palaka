import { getOutline } from './geoOutline'
import { getTableBox } from './tableBox'
import { getColumnAnchor, getTableLayout, getTableView } from './tableLayout'
import type { Binding, LineShape, Page, Point, Shape } from './types'

// Room between a block and the arrow tip, so the head never digs into the
// outline and still reads as "pointing at" it.
const ATTACH_GAP = 8

type BindableShape = Extract<
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
function boxOf(shape: BindableShape) {
  return shape.type === 'table' ? getTableBox(shape) : shape
}

function getTarget(page: Page, binding?: Binding): BindableShape | null {
  if (!binding) return null
  const shape = page.shapes[binding.shapeId]
  return isBindable(shape) ? shape : null
}

function centreOf(shape: BindableShape): Point {
  const { x, y, w, h } = boxOf(shape)
  return { x: x + w / 2, y: y + h / 2 }
}

function anchorPoint(shape: BindableShape, anchor: Point): Point {
  const { x, y, w, h } = boxOf(shape)
  return { x: x + anchor.x * w, y: y + anchor.y * h }
}

// What the other end aims at: a pinned spot, a foreign key's column row,
// else the centre.
function aimOf(shape: BindableShape, binding?: Binding): Point {
  if (binding?.anchor) return anchorPoint(shape, binding.anchor)
  const centre = centreOf(shape)
  if (shape.type !== 'table' || !binding?.column) return centre
  if (getTableView(shape) === 'data') return centre
  const column = binding.column.toLowerCase()
  const row = getTableLayout(shape).rows.find(
    (r) => r.column.name.toLowerCase() === column,
  )
  return row ? { x: centre.x, y: row.centreY } : centre
}

function outlineOf(shape: BindableShape): Point[] {
  if (shape.type !== 'image') return getOutline(shape)
  const { x, y, w, h } = shape
  return [
    { x, y },
    { x: x + w, y },
    { x: x + w, y: y + h },
    { x, y: y + h },
  ]
}

// Distance along the ray (in units of `dir`) to the nearest outline edge.
function rayHit(origin: Point, dir: Point, polygon: Point[]): number | null {
  let nearest: number | null = null
  for (let i = 0; i < polygon.length; i++) {
    const a = polygon[i]
    const b = polygon[(i + 1) % polygon.length]
    const ex = b.x - a.x
    const ey = b.y - a.y
    const denom = dir.x * ey - dir.y * ex
    if (Math.abs(denom) < 1e-9) continue
    const t = ((a.x - origin.x) * ey - (a.y - origin.y) * ex) / denom
    const u = ((a.x - origin.x) * dir.y - (a.y - origin.y) * dir.x) / denom
    if (t > 0 && u >= 0 && u <= 1 && (nearest === null || t < nearest)) {
      nearest = t
    }
  }
  return nearest
}

// Aim at the target's centre from `toward`, stop at its outline plus a gap.
// When `toward` sits inside the target there is no sensible edge, so the end
// simply goes to the centre.
function attachPoint(
  target: BindableShape,
  toward: Point,
  binding?: Binding,
): Point {
  if (target.type === 'table' && binding?.column) {
    const anchor = getColumnAnchor(target, binding.column, toward, ATTACH_GAP)
    if (anchor) return anchor
  }
  const centre = centreOf(target)
  if (binding?.anchor) return pinnedPoint(target, binding.anchor)
  const dir = { x: toward.x - centre.x, y: toward.y - centre.y }
  const distance = Math.hypot(dir.x, dir.y)
  const t = distance > 0 ? rayHit(centre, dir, outlineOf(target)) : null
  if (t === null || t >= 1) return centre
  const gap = ATTACH_GAP / distance
  const reach = Math.min(1, t + gap)
  return { x: centre.x + dir.x * reach, y: centre.y + dir.y * reach }
}

// A pinned end sits on the outline where it was dropped, pushed out by the
// same gap a free end gets.
function pinnedPoint(target: BindableShape, anchor: Point): Point {
  const centre = centreOf(target)
  const spot = anchorPoint(target, anchor)
  const dir = { x: spot.x - centre.x, y: spot.y - centre.y }
  const distance = Math.hypot(dir.x, dir.y)
  if (distance === 0) return centre
  const t = rayHit(centre, dir, outlineOf(target)) ?? 1
  const reach = t + ATTACH_GAP / distance
  return { x: centre.x + dir.x * reach, y: centre.y + dir.y * reach }
}

// Inside this share of the box around the centre, a drop means "this block",
// not "this spot", so the end keeps sliding to the nearest edge.
const CENTRE_ZONE = 0.25
// Near a side's midpoint the end clicks onto it, so tidy diagrams line up.
const MIDPOINT_SNAP = 0.12
const SIDE_MIDPOINTS: Point[] = [
  { x: 0.5, y: 0 },
  { x: 1, y: 0.5 },
  { x: 0.5, y: 1 },
  { x: 0, y: 0.5 },
]

// The binding for an end dropped at `point` on `target`: pinned to that spot
// unless it landed near the centre (or on a table, which aims by column).
export function bindingAt(target: BindableShape, point: Point): Binding {
  const binding: Binding = { shapeId: target.id }
  if (target.type === 'table') return binding
  const { x, y, w, h } = boxOf(target)
  if (w <= 0 || h <= 0) return binding
  const nx = (point.x - x) / w
  const ny = (point.y - y) / h
  const offCentre = Math.max(Math.abs(nx - 0.5), Math.abs(ny - 0.5))
  if (offCentre < CENTRE_ZONE) return binding
  const snapped = SIDE_MIDPOINTS.find(
    (m) => Math.hypot(m.x - nx, m.y - ny) < MIDPOINT_SNAP,
  )
  const clamp = (v: number) => Math.min(1.2, Math.max(-0.2, v))
  return { ...binding, anchor: snapped ?? { x: clamp(nx), y: clamp(ny) } }
}

export function routeConnector(page: Page, line: LineShape): LineShape {
  const from = getTarget(page, line.startBinding)
  const to = getTarget(page, line.endBinding)
  if (!from && !to) return line
  const startRef = to ? aimOf(to, line.endBinding) : { x: line.x2, y: line.y2 }
  const endRef = from
    ? aimOf(from, line.startBinding)
    : { x: line.x1, y: line.y1 }
  const start = from
    ? attachPoint(from, startRef, line.startBinding)
    : { x: line.x1, y: line.y1 }
  const end = to
    ? attachPoint(to, endRef, line.endBinding)
    : { x: line.x2, y: line.y2 }
  return { ...line, x1: start.x, y1: start.y, x2: end.x, y2: end.y }
}

function isBoundTo(line: LineShape, ids: Set<string>): boolean {
  return (
    (!!line.startBinding && ids.has(line.startBinding.shapeId)) ||
    (!!line.endBinding && ids.has(line.endBinding.shapeId))
  )
}

// Every connector touching a changed shape (or a changed connector itself)
// is re-routed in the same document edit, so a drag stays one undo step.
export function rerouteConnectors(page: Page, changedIds: string[]): Page {
  const changed = new Set(changedIds)
  let shapes: Page['shapes'] | null = null
  for (const id of page.order) {
    const shape = page.shapes[id]
    if (shape.type !== 'line') continue
    if (!changed.has(id) && !isBoundTo(shape, changed)) continue
    const routed = routeConnector(page, shape)
    if (routed === shape) continue
    shapes ??= { ...page.shapes }
    shapes[id] = routed
  }
  return shapes ? { ...page, shapes } : page
}

function withoutBindingsTo(line: LineShape, ids: Set<string>): LineShape {
  const { startBinding, endBinding, ...rest } = line
  const keep = (b?: Binding) => (b && !ids.has(b.shapeId) ? b : undefined)
  const start = keep(startBinding)
  const end = keep(endBinding)
  return {
    ...rest,
    ...(start && { startBinding: start }),
    ...(end && { endBinding: end }),
  }
}

// Connectors outlive what they pointed at: the end stays where it was,
// just no longer glued.
export function unbindFrom(page: Page, removedIds: Set<string>): Page {
  let shapes: Page['shapes'] | null = null
  for (const id of page.order) {
    const shape = page.shapes[id]
    if (shape.type !== 'line' || !isBoundTo(shape, removedIds)) continue
    shapes ??= { ...page.shapes }
    shapes[id] = withoutBindingsTo(shape, removedIds)
  }
  return shapes ? { ...page, shapes } : page
}

// Drops ends glued to something that is gone or cannot hold a connector
// (a damaged or hand-edited file).
export function dropBrokenBindings(page: Page): Page {
  const broken = new Set<string>()
  for (const shape of Object.values(page.shapes)) {
    if (shape.type !== 'line') continue
    for (const binding of [shape.startBinding, shape.endBinding]) {
      if (binding && !isBindable(page.shapes[binding.shapeId])) {
        broken.add(binding.shapeId)
      }
    }
  }
  return broken.size > 0 ? unbindFrom(page, broken) : page
}

// Copies of a connector follow copies of its ends; an end whose target was
// not copied comes loose, so the copy never pulls on the original block.
export function remapBindings(shape: Shape, idMap: Map<string, string>): Shape {
  if (shape.type !== 'line') return shape
  const remap = (b?: Binding) => {
    const copied = b && idMap.get(b.shapeId)
    return copied ? { ...b, shapeId: copied } : undefined
  }
  const { startBinding, endBinding, ...rest } = shape
  const start = remap(startBinding)
  const end = remap(endBinding)
  return {
    ...rest,
    ...(start && { startBinding: start }),
    ...(end && { endBinding: end }),
  }
}

export function detachLine(line: LineShape): LineShape {
  const { startBinding: _start, endBinding: _end, ...rest } = line
  return rest
}

// How far outside a box (in its own units) the point is; 0 when inside.
function distanceOutside(target: BindableShape, point: Point): number {
  const shape = boxOf(target)
  const dx = Math.max(shape.x - point.x, 0, point.x - (shape.x + shape.w))
  const dy = Math.max(shape.y - point.y, 0, point.y - (shape.y + shape.h))
  return Math.hypot(dx, dy)
}

// The shape an arrow end at `point` would stick to. Inside the box counts
// (an unfilled box is still easy to hit), and so does a near miss within
// `snapReach`: aiming at a small block with a mouse should not need pixel
// precision. Inside wins (top-most first); otherwise the nearest box.
export function findBindTarget(
  page: Page,
  point: Point,
  excludeId?: string,
  snapReach = 0,
): BindableShape | null {
  let nearest: BindableShape | null = null
  let nearestDistance = Infinity
  for (let i = page.order.length - 1; i >= 0; i--) {
    const shape = page.shapes[page.order[i]]
    if (shape.id === excludeId || !isBindable(shape)) continue
    const distance = distanceOutside(shape, point)
    if (distance === 0) return shape
    if (distance <= snapReach && distance < nearestDistance) {
      nearest = shape
      nearestDistance = distance
    }
  }
  return nearest
}
