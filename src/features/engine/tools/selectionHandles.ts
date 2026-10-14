import { getShapesInOrder } from '../model/documentOps'
import { getShapeBounds, unionBounds } from '../model/geometry'
import type { Bounds, Page } from '../model/types'

// Screen pixels: handles look and grab the same at any board size.
export const HANDLE_SIZE_PX = 10
const HANDLE_GRAB_PX = 12

export type HandleCorner = 'nw' | 'ne' | 'sw' | 'se'

export const HANDLE_CORNERS: HandleCorner[] = ['nw', 'ne', 'sw', 'se']

export function getSelectionBounds(
  page: Page,
  selectedIds: string[],
): Bounds | null {
  return unionBounds(getShapesInOrder(page, selectedIds).map(getShapeBounds))
}

export function getCornerPoint(bounds: Bounds, corner: HandleCorner) {
  return {
    x: corner.endsWith('w') ? bounds.minX : bounds.maxX,
    y: corner.startsWith('n') ? bounds.minY : bounds.maxY,
  }
}

export function getOppositeCorner(corner: HandleCorner): HandleCorner {
  const vertical = corner[0] === 'n' ? 's' : 'n'
  const horizontal = corner[1] === 'w' ? 'e' : 'w'
  return `${vertical}${horizontal}` as HandleCorner
}

export function findHandleAt(
  bounds: Bounds,
  x: number,
  y: number,
  unitsPerPixel: number,
): HandleCorner | null {
  const reach = HANDLE_GRAB_PX * unitsPerPixel
  return (
    HANDLE_CORNERS.find((corner) => {
      const point = getCornerPoint(bounds, corner)
      return Math.abs(point.x - x) <= reach && Math.abs(point.y - y) <= reach
    }) ?? null
  )
}
