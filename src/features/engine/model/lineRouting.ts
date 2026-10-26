import type { LineShape, Point } from './types'

export type LineTangent = {
  tip: Point
  angle: number
}

// The one place that decides an elbow's first leg; every path, tangent and
// sample reads it, so they can never disagree.
export function isElbowHorizontalFirst(line: LineShape): boolean {
  if (line.elbowAxis) return line.elbowAxis === 'h'
  return Math.abs(line.x2 - line.x1) >= Math.abs(line.y2 - line.y1)
}

function getElbowParams(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  isHorizontalFirst: boolean,
) {
  const r = Math.min(16, Math.abs(x2 - x1) / 2, Math.abs(y2 - y1) / 2)
  return { isHorizontalFirst, r }
}

function buildHorizontalElbowPath(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  r: number,
): string {
  const midX = (x1 + x2) / 2
  if (r < 2) return `M${x1},${y1} L${midX},${y1} L${midX},${y2} L${x2},${y2}`
  const s1x = Math.sign(midX - x1) || 1
  const s1y = Math.sign(y2 - y1) || 1
  const s2x = Math.sign(x2 - midX) || 1
  return (
    `M${x1},${y1} ` +
    `L${midX - s1x * r},${y1} Q${midX},${y1} ${midX},${y1 + s1y * r} ` +
    `L${midX},${y2 - s1y * r} Q${midX},${y2} ${midX + s2x * r},${y2} ` +
    `L${x2},${y2}`
  )
}

function buildVerticalElbowPath(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  r: number,
): string {
  const midY = (y1 + y2) / 2
  if (r < 2) return `M${x1},${y1} L${x1},${midY} L${x2},${midY} L${x2},${y2}`
  const s1y = Math.sign(midY - y1) || 1
  const s1x = Math.sign(x2 - x1) || 1
  const s2y = Math.sign(y2 - midY) || 1
  return (
    `M${x1},${y1} ` +
    `L${x1},${midY - s1y * r} Q${x1},${midY} ${x1 + s1x * r},${midY} ` +
    `L${x2 - s1x * r},${midY} Q${x2},${midY} ${x2},${midY + s2y * r} ` +
    `L${x2},${y2}`
  )
}

export function getLineControlPoint(line: LineShape): Point {
  const dx = line.x2 - line.x1
  const dy = line.y2 - line.y1
  const dist = Math.hypot(dx, dy) || 1
  const nx = -dy / dist
  const ny = dx / dist
  const offset = Math.min(65, Math.max(25, dist * 0.2))
  return {
    x: (line.x1 + line.x2) / 2 + nx * offset,
    y: (line.y1 + line.y2) / 2 + ny * offset,
  }
}

export function getLinePath(
  line: LineShape,
  offset: { dx: number; dy: number } = { dx: 0, dy: 0 },
): string {
  const x1 = line.x1 + offset.dx
  const y1 = line.y1 + offset.dy
  const x2 = line.x2 + offset.dx
  const y2 = line.y2 + offset.dy
  const routing = line.routing ?? 'straight'

  if (routing === 'curved') {
    const cp = getLineControlPoint(line)
    return `M${x1},${y1} Q${cp.x + offset.dx},${cp.y + offset.dy} ${x2},${y2}`
  }

  if (routing === 'elbow') {
    const { isHorizontalFirst, r } = getElbowParams(
      x1,
      y1,
      x2,
      y2,
      isElbowHorizontalFirst(line),
    )
    return isHorizontalFirst
      ? buildHorizontalElbowPath(x1, y1, x2, y2, r)
      : buildVerticalElbowPath(x1, y1, x2, y2, r)
  }

  return `M${x1},${y1} L${x2},${y2}`
}

export function getLineEndPointTangent(line: LineShape): LineTangent {
  const tip = { x: line.x2, y: line.y2 }
  const routing = line.routing ?? 'straight'

  if (routing === 'curved') {
    const cp = getLineControlPoint(line)
    return { tip, angle: Math.atan2(line.y2 - cp.y, line.x2 - cp.x) }
  }

  if (routing === 'elbow') {
    const isHorizontalFirst = isElbowHorizontalFirst(line)
    if (isHorizontalFirst) {
      const midX = (line.x1 + line.x2) / 2
      return { tip, angle: Math.atan2(0, line.x2 - midX) }
    }
    const midY = (line.y1 + line.y2) / 2
    return { tip, angle: Math.atan2(line.y2 - midY, 0) }
  }

  return { tip, angle: Math.atan2(line.y2 - line.y1, line.x2 - line.x1) }
}

export function getLineMidpoint(line: LineShape): Point {
  const routing = line.routing ?? 'straight'

  if (routing === 'curved') {
    const cp = getLineControlPoint(line)
    return {
      x: 0.25 * line.x1 + 0.5 * cp.x + 0.25 * line.x2,
      y: 0.25 * line.y1 + 0.5 * cp.y + 0.25 * line.y2,
    }
  }

  if (routing === 'elbow') {
    const isHorizontalFirst = isElbowHorizontalFirst(line)
    return isHorizontalFirst
      ? { x: (line.x1 + line.x2) / 2, y: (line.y1 + line.y2) / 2 }
      : { x: (line.x1 + line.x2) / 2, y: (line.y1 + line.y2) / 2 }
  }

  return { x: (line.x1 + line.x2) / 2, y: (line.y1 + line.y2) / 2 }
}

// Dense enough that a mask, a hit test or a packet riding the curve never
// visibly cuts the corner.
const CURVE_SAMPLES = 24
const CURVE_STEPS = Array.from(
  { length: CURVE_SAMPLES + 1 },
  (_, i) => i / CURVE_SAMPLES,
)

export function getLineSamplePoints(line: LineShape): Point[] {
  const routing = line.routing ?? 'straight'
  const p0 = { x: line.x1, y: line.y1 }
  const p3 = { x: line.x2, y: line.y2 }

  if (routing === 'curved') {
    const cp = getLineControlPoint(line)
    return CURVE_STEPS.map((t) => ({
      x: (1 - t) * (1 - t) * line.x1 + 2 * (1 - t) * t * cp.x + t * t * line.x2,
      y: (1 - t) * (1 - t) * line.y1 + 2 * (1 - t) * t * cp.y + t * t * line.y2,
    }))
  }

  if (routing === 'elbow') {
    const isHorizontalFirst = isElbowHorizontalFirst(line)
    if (isHorizontalFirst) {
      const midX = (line.x1 + line.x2) / 2
      return [p0, { x: midX, y: line.y1 }, { x: midX, y: line.y2 }, p3]
    }
    const midY = (line.y1 + line.y2) / 2
    return [p0, { x: line.x1, y: midY }, { x: line.x2, y: midY }, p3]
  }

  return [p0, p3]
}
