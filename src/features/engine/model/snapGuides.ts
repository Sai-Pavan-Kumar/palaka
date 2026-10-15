import type { Bounds } from './types'

export type SnapGuide =
  | { type: 'x'; x: number; minY: number; maxY: number }
  | { type: 'y'; y: number; minX: number; maxX: number }

export type SnapResult = {
  dx: number
  dy: number
  guides: SnapGuide[]
}

const EXTEND_PAD = 12

function axisPoints(b: Bounds, axis: 'x' | 'y'): [number, number, number] {
  const min = axis === 'x' ? b.minX : b.minY
  const max = axis === 'x' ? b.maxX : b.maxY
  return [min, (min + max) / 2, max]
}

function buildGuide(
  axis: 'x' | 'y',
  val: number,
  moving: Bounds,
  target: Bounds,
): SnapGuide {
  return axis === 'x'
    ? {
        type: 'x',
        x: val,
        minY: Math.min(moving.minY, target.minY) - EXTEND_PAD,
        maxY: Math.max(moving.maxY, target.maxY) + EXTEND_PAD,
      }
    : {
        type: 'y',
        y: val,
        minX: Math.min(moving.minX, target.minX) - EXTEND_PAD,
        maxX: Math.max(moving.maxX, target.maxX) + EXTEND_PAD,
      }
}

function snapAxis(
  movingBounds: Bounds,
  targetBoundsList: Bounds[],
  axis: 'x' | 'y',
  threshold: number,
): { delta: number; guide: SnapGuide | null } {
  let minDiff = threshold
  let bestDelta = 0
  let bestGuide: SnapGuide | null = null
  const movingPoints = axisPoints(movingBounds, axis)

  for (const target of targetBoundsList) {
    const targetPoints = axisPoints(target, axis)
    for (const mVal of movingPoints) {
      for (const tVal of targetPoints) {
        const diff = tVal - mVal
        if (Math.abs(diff) < Math.abs(minDiff)) {
          minDiff = diff
          bestDelta = diff
          bestGuide = buildGuide(axis, tVal, movingBounds, target)
        }
      }
    }
  }

  return { delta: bestDelta, guide: bestGuide }
}

export function computeSnap(
  movingBounds: Bounds,
  targetBoundsList: Bounds[],
  threshold = 8,
): SnapResult {
  if (targetBoundsList.length === 0) {
    return { dx: 0, dy: 0, guides: [] }
  }

  const snapX = snapAxis(movingBounds, targetBoundsList, 'x', threshold)
  const snapY = snapAxis(movingBounds, targetBoundsList, 'y', threshold)

  const guides: SnapGuide[] = []
  if (snapX.guide) guides.push(snapX.guide)
  if (snapY.guide) guides.push(snapY.guide)

  return {
    dx: snapX.delta,
    dy: snapY.delta,
    guides,
  }
}
