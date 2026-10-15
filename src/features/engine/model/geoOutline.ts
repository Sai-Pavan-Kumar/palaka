import { BLOCK_CORNER_RADIUS } from './blockCatalog'
import { getTableBox } from './tableBox'
import type { BlockShape, GeoShape, Point, TableShape } from './types'

// Enough corners that an ellipse looks round at 4K and hit tests stay exact
// to well under a pixel.
const ELLIPSE_SEGMENTS = 64
const HEART_SEGMENTS = 64

// The classic heart curve, sampled once and scaled to 0..1 on both axes.
// It starts at the dip on top, so the draw-on reveal traces it like a hand.
const UNIT_HEART: Point[] = (() => {
  const raw = Array.from({ length: HEART_SEGMENTS }, (_, i) => {
    const t = (i / HEART_SEGMENTS) * Math.PI * 2
    return {
      x: 16 * Math.sin(t) ** 3,
      y: -(
        13 * Math.cos(t) -
        5 * Math.cos(2 * t) -
        2 * Math.cos(3 * t) -
        Math.cos(4 * t)
      ),
    }
  })
  const xs = raw.map((p) => p.x)
  const ys = raw.map((p) => p.y)
  const minX = Math.min(...xs)
  const minY = Math.min(...ys)
  const spanX = Math.max(...xs) - minX
  const spanY = Math.max(...ys) - minY
  return raw.map((p) => ({ x: (p.x - minX) / spanX, y: (p.y - minY) / spanY }))
})()

// Blocks share the geo pipeline (fill, hand style, draw-on), only their
// outline differs.
export type OutlinedShape = GeoShape | BlockShape | TableShape

const CORNER_SEGMENTS = 6

// Starts at the top-left corner's end and runs clockwise, like a rectangle.
function roundedRectOutline(box: {
  x: number
  y: number
  w: number
  h: number
}): Point[] {
  const { x, y, w, h } = box
  const r = Math.min(BLOCK_CORNER_RADIUS, w / 2, h / 2)
  const corners = [
    { cx: x + w - r, cy: y + r, from: -Math.PI / 2 },
    { cx: x + w - r, cy: y + h - r, from: 0 },
    { cx: x + r, cy: y + h - r, from: Math.PI / 2 },
    { cx: x + r, cy: y + r, from: Math.PI },
  ]
  return corners.flatMap(({ cx, cy, from }) =>
    Array.from({ length: CORNER_SEGMENTS + 1 }, (_, i) => {
      const angle = from + (i / CORNER_SEGMENTS) * (Math.PI / 2)
      return { x: cx + Math.cos(angle) * r, y: cy + Math.sin(angle) * r }
    }),
  )
}

export function getOutline(shape: OutlinedShape): Point[] {
  if (shape.type === 'block') return roundedRectOutline(shape)
  if (shape.type === 'table') return roundedRectOutline(getTableBox(shape))
  return getGeoOutline(shape)
}

// The closed outline every geo shape is drawn, filled and hit-tested from.
export function getGeoOutline(shape: GeoShape): Point[] {
  const { x, y, w, h } = shape
  switch (shape.geo) {
    case 'rectangle':
      return [
        { x, y },
        { x: x + w, y },
        { x: x + w, y: y + h },
        { x, y: y + h },
      ]
    case 'triangle':
      return [
        { x: x + w / 2, y },
        { x: x + w, y: y + h },
        { x, y: y + h },
      ]
    case 'diamond':
      return [
        { x: x + w / 2, y },
        { x: x + w, y: y + h / 2 },
        { x: x + w / 2, y: y + h },
        { x, y: y + h / 2 },
      ]
    case 'heart':
      return UNIT_HEART.map((p) => ({ x: x + p.x * w, y: y + p.y * h }))
    case 'ellipse':
      return Array.from({ length: ELLIPSE_SEGMENTS }, (_, i) => {
        const angle = (i / ELLIPSE_SEGMENTS) * Math.PI * 2
        return {
          x: x + w / 2 + (Math.cos(angle) * w) / 2,
          y: y + h / 2 + (Math.sin(angle) * h) / 2,
        }
      })
  }
}

export function outlineToSvgPath(points: Point[]): string {
  const [first, ...rest] = points
  const segments = rest.map((p) => `L${p.x.toFixed(2)},${p.y.toFixed(2)}`)
  return `M${first.x.toFixed(2)},${first.y.toFixed(2)} ${segments.join(' ')} Z`
}
