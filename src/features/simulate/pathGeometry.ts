import {
  getLineControlPoint,
  getLineSamplePoints,
} from '../engine/model/lineRouting'
import type { LineShape, Point } from '../engine/model/types'
import type { SimEdge } from './simTypes'

// Enough points that a packet on a curve never visibly cuts the corner.
const CURVE_SAMPLES = 24

function samplePoints(line: LineShape): Point[] {
  if ((line.routing ?? 'straight') !== 'curved')
    return getLineSamplePoints(line)
  const cp = getLineControlPoint(line)
  return Array.from({ length: CURVE_SAMPLES + 1 }, (_, i) => {
    const t = i / CURVE_SAMPLES
    const a = (1 - t) * (1 - t)
    const b = 2 * (1 - t) * t
    const c = t * t
    return {
      x: a * line.x1 + b * cp.x + c * line.x2,
      y: a * line.y1 + b * cp.y + c * line.y2,
    }
  })
}

export function toSimEdge(line: LineShape): SimEdge {
  const points = samplePoints(line)
  const cumulative = [0]
  for (let i = 1; i < points.length; i++) {
    const step = Math.hypot(
      points[i].x - points[i - 1].x,
      points[i].y - points[i - 1].y,
    )
    cumulative.push(cumulative[i - 1] + step)
  }
  return {
    id: line.id,
    points,
    cumulative,
    length: cumulative[cumulative.length - 1],
  }
}

// `distance` is measured from the start of travel, so a reversed hop
// counts from the line's end.
export function pointOnEdge(
  edge: SimEdge,
  distance: number,
  reverse: boolean,
): Point {
  const along = Math.min(
    edge.length,
    Math.max(0, reverse ? edge.length - distance : distance),
  )
  const { points, cumulative } = edge
  let i = 1
  while (i < points.length - 1 && cumulative[i] < along) i++
  const span = cumulative[i] - cumulative[i - 1] || 1
  const t = (along - cumulative[i - 1]) / span
  return {
    x: points[i - 1].x + (points[i].x - points[i - 1].x) * t,
    y: points[i - 1].y + (points[i].y - points[i - 1].y) * t,
  }
}
