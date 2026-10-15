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

function snapAxis(
  movingPoints: [number, number, number],
  targetBoundsList: Bounds[],
  axis: 'x' | 'y',
  threshold: number,
): { delta: number; guide: SnapGuide | null } {
  let minDiff = threshold
  let bestDelta = 0
  let bestGuide: SnapGuide | null = null

  for (const target of targetBoundsList) {
    const tMin = axis === 'x' ? target.minX : target.minY
    const tMax = axis === 'x' ? target.maxX : target.maxY
    const tCenter = (tMin + tMax) / 2
    const targetPoints = [tMin, tCenter, tMax]

    for (const mVal of movingPoints) {
      for (const tVal of targetPoints) {
        const diff = tVal - mVal
        if (Math.abs(diff) < Math.abs(minDiff)) {
          minDiff = diff
          bestDelta = diff
          bestGuide =
            axis === 'x'
              ? {
                  type: 'x',
                  x: tVal,
                  minY: Math.min(movingPoints[0], target.minY) - EXTEND_PAD,
                  maxY: Math.max(movingPoints[2], target.maxY) + EXTEND_PAD,
                }
              : {
                  type: 'y',
                  y: tVal,
                  minX: Math.min(movingPoints[0], target.minX) - EXTEND_PAD,
                  maxX: Math.max(movingPoints[2], target.maxX) + EXTEND_PAD,
                }
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

  const mX: [number, number, number] = [
    movingBounds.minX,
    (movingBounds.minX + movingBounds.maxX) / 2,
    movingBounds.maxX,
  ]
  const mY: [number, number, number] = [
    movingBounds.minY,
    (movingBounds.minY + movingBounds.maxY) / 2,
    movingBounds.maxY,
  ]

  const snapX = snapAxis(mX, targetBoundsList, 'x', threshold)
  const snapY = snapAxis(mY, targetBoundsList, 'y', threshold)

  const guides: SnapGuide[] = []
  if (snapX.guide) guides.push(snapX.guide)
  if (snapY.guide) guides.push(snapY.guide)

  return {
    dx: snapX.delta,
    dy: snapY.delta,
    guides,
  }
}
