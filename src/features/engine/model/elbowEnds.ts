import type { Point } from './types'

export type EndBox = { x: number; y: number; w: number; h: number }

// An elbow leaves one box through a side and enters the other through the
// facing side, so its last leg meets the outline square on and the head
// points straight in. Free ends are zero-size boxes at their point.
function sidePoints(a: EndBox, b: EndBox, horizontal: boolean, gap: number) {
  const ca = { x: a.x + a.w / 2, y: a.y + a.h / 2 }
  const cb = { x: b.x + b.w / 2, y: b.y + b.h / 2 }
  const ga = a.w > 0 ? gap : 0
  const gb = b.w > 0 ? gap : 0
  if (horizontal) {
    const right = cb.x >= ca.x
    return {
      start: { x: right ? a.x + a.w + ga : a.x - ga, y: ca.y },
      end: { x: right ? b.x - gb : b.x + b.w + gb, y: cb.y },
    }
  }
  const down = cb.y >= ca.y
  return {
    start: { x: ca.x, y: down ? a.y + a.h + ga : a.y - ga },
    end: { x: cb.x, y: down ? b.y - gb : b.y + b.h + gb },
  }
}

// The longer axis between the centres goes first. A side pair only works
// when the boxes do not overlap on that axis (else the leg would run back
// through a box); then the other axis is tried, then plain aiming.
export function elbowEnds(
  a: EndBox,
  b: EndBox,
  gap: number,
): { start: Point; end: Point; axis: 'h' | 'v' } | null {
  const dx = b.x + b.w / 2 - (a.x + a.w / 2)
  const dy = b.y + b.h / 2 - (a.y + a.h / 2)
  const order = Math.abs(dx) >= Math.abs(dy) ? [true, false] : [false, true]
  for (const horizontal of order) {
    const { start, end } = sidePoints(a, b, horizontal, gap)
    const ex = end.x - start.x
    const ey = end.y - start.y
    const clear = horizontal
      ? Math.sign(ex) === Math.sign(dx || 1)
      : Math.sign(ey) === Math.sign(dy || 1)
    if (clear) return { start, end, axis: horizontal ? 'h' : 'v' }
  }
  return null
}
