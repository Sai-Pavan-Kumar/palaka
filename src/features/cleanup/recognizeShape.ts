type Point = { x: number; y: number }

export type RecognizedShape =
  | {
      kind: 'rectangle' | 'ellipse'
      x: number
      y: number
      w: number
      h: number
    }
  | { kind: 'line'; start: Point; end: Point }

const MIN_POINTS = 8
const MIN_SIZE = 24
// A stroke counts as a straight line when its ends are almost as far apart as
// the whole path is long.
const LINE_STRAIGHTNESS = 0.94
// Start and end must meet within this share of the shape's size to be "closed".
const CLOSED_GAP_RATIO = 0.25
// Error baselines: a perfect circle scores ~0.05 against a rectangle, and a
// perfect rectangle scores ~0.15 against an ellipse. Scores are relative to these.
const RECTANGLE_BASELINE = 0.05
const ELLIPSE_BASELINE = 0.15
const MAX_RELATIVE_SCORE = 0.6

const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y)

function pathLength(points: Point[]): number {
  let total = 0
  for (let i = 1; i < points.length; i++)
    total += distance(points[i - 1], points[i])
  return total
}

function boundsOf(points: Point[]) {
  const xs = points.map((p) => p.x)
  const ys = points.map((p) => p.y)
  const minX = Math.min(...xs)
  const minY = Math.min(...ys)
  return { minX, minY, w: Math.max(...xs) - minX, h: Math.max(...ys) - minY }
}

function rectangleError(
  points: Point[],
  b: ReturnType<typeof boundsOf>,
): number {
  const maxX = b.minX + b.w
  const maxY = b.minY + b.h
  const total = points.reduce((sum, p) => {
    const toEdge = Math.min(p.x - b.minX, maxX - p.x, p.y - b.minY, maxY - p.y)
    return sum + Math.abs(toEdge)
  }, 0)
  return total / points.length / Math.min(b.w, b.h)
}

function ellipseError(points: Point[], b: ReturnType<typeof boundsOf>): number {
  const rx = b.w / 2
  const ry = b.h / 2
  const cx = b.minX + rx
  const cy = b.minY + ry
  const total = points.reduce((sum, p) => {
    const radius = Math.hypot((p.x - cx) / rx, (p.y - cy) / ry)
    return sum + Math.abs(radius - 1)
  }, 0)
  return total / points.length
}

// Returns null for anything that is not clearly a box, oval or line, so
// handwriting (an "O", a "D") is left exactly as drawn.
export function recognizeShape(points: Point[]): RecognizedShape | null {
  if (points.length < MIN_POINTS) return null
  const bounds = boundsOf(points)
  if (Math.max(bounds.w, bounds.h) < MIN_SIZE) return null

  const start = points[0]
  const end = points[points.length - 1]
  const length = pathLength(points)
  if (distance(start, end) / length >= LINE_STRAIGHTNESS) {
    return { kind: 'line', start, end }
  }

  const isClosed =
    distance(start, end) <= Math.hypot(bounds.w, bounds.h) * CLOSED_GAP_RATIO
  if (!isClosed || Math.min(bounds.w, bounds.h) < MIN_SIZE) return null

  const rectangleScore = rectangleError(points, bounds) / RECTANGLE_BASELINE
  const ellipseScore = ellipseError(points, bounds) / ELLIPSE_BASELINE
  const box = { x: bounds.minX, y: bounds.minY, w: bounds.w, h: bounds.h }
  if (rectangleScore < ellipseScore && rectangleScore < MAX_RELATIVE_SCORE) {
    return { kind: 'rectangle', ...box }
  }
  if (ellipseScore < MAX_RELATIVE_SCORE) return { kind: 'ellipse', ...box }
  return null
}
