import { SLOWEST_PACE } from '../../animate/motion'
import { getPenWidth, getStrokeWidth } from '../model/boardSpec'
import { isBuildingBlock } from '../model/buildings'
import { getOutline } from '../model/geoOutline'
import { getShapeBounds } from '../model/geometry'
import { getLineSamplePoints } from '../model/lineRouting'
import type { Point, Shape, TextAnimation } from '../model/types'
import { getArrowheadWings } from './shapePaths'

// Slide pixels per second. Fast enough that a long arrow does not stall the
// talk, slow enough that the eye follows the line being drawn.
const DRAW_SPEED = 1400
const MIN_DRAW_S = 0.35
const MAX_DRAW_S = 1.6
// After this, a revealed shape is shown plainly whatever the animation did.
export const DRAW_ON_SAFETY_MS = MAX_DRAW_S * SLOWEST_PACE * 1000 + 300
// The mask band is wider than the ink so hand-drawn wobble and pen pressure
// never poke out of it.
export const MASK_WIDTH_FACTOR = 2.2
export const MASK_MARGIN = 12
// Far bigger than any slide, so thin or off-slide shapes are never clipped.
export const MASK_REGION = 30000

export type DrawPlan =
  | { kind: 'trace'; d: string; length: number; width: number }
  | { kind: 'wipe'; length: number; animation: TextAnimation }

function polyline(points: Point[]): { d: string; length: number } {
  let length = 0
  for (let i = 1; i < points.length; i++) {
    length += Math.hypot(
      points[i].x - points[i - 1].x,
      points[i].y - points[i - 1].y,
    )
  }
  const [first, ...rest] = points
  const d =
    `M${first.x},${first.y} ` + rest.map((p) => `L${p.x},${p.y}`).join(' ')
  return { d, length }
}

// The centre line in the order the ink was laid down: a pen stroke follows
// its own points, an arrow goes start → tip → head, an outline goes round.
function outlinePlan(shape: Parameters<typeof getOutline>[0]): DrawPlan {
  const outline = getOutline(shape)
  const closed = polyline([...outline, outline[0]])
  return { kind: 'trace', ...closed, width: getStrokeWidth(shape) }
}

export function getDrawPlan(shape: Shape): DrawPlan | null {
  switch (shape.type) {
    case 'stroke': {
      const { d, length } = polyline(shape.points.map(([x, y]) => ({ x, y })))
      // A dot has no length to trace; it simply appears.
      if (length < 1) return null
      return { kind: 'trace', d, length, width: getPenWidth(shape) }
    }
    case 'line': {
      const width = getStrokeWidth(shape)
      // Follow the real route (curve, elbow), or the bent parts would stay
      // hidden while the arrow draws itself in.
      const body = polyline(getLineSamplePoints(shape))
      if (!shape.arrowhead) return { kind: 'trace', ...body, width }
      const { tip, left, right } = getArrowheadWings(shape, width)
      const wings = polyline([left, tip, right])
      return {
        kind: 'trace',
        d: `${body.d} ${wings.d}`,
        length: body.length + wings.length,
        width,
      }
    }
    case 'block':
      if (isBuildingBlock(shape)) return null
      return outlinePlan(shape)
    case 'geo':
    case 'table':
      return outlinePlan(shape)
    case 'text': {
      const bounds = getShapeBounds(shape)
      return {
        kind: 'wipe',
        length: bounds.maxX - bounds.minX,
        animation: shape.textAnimation ?? 'wipe',
      }
    }
    case 'image':
    case 'highlight':
    case 'tableState':
      return null
  }
}

export function getDrawDuration(shape: Shape): number | null {
  const plan = getDrawPlan(shape)
  if (!plan) return null
  return Math.min(MAX_DRAW_S, Math.max(MIN_DRAW_S, plan.length / DRAW_SPEED))
}

export function drawMaskId(shape: Shape): string {
  return `draw-on-${shape.id}`
}
