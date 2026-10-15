import { getShapesInOrder } from '../model/documentOps'
import { getShapeBounds, unionBounds } from '../model/geometry'
import type { Bounds, LineShape, Page } from '../model/types'

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

export type LineEnd = 'start' | 'end'

// One selected line or arrow gets end handles instead of a box: its ends
// are what you want to move (and re-attach), not its bounding box.
export function getSoloLine(page: Page, selectedIds: string[]) {
  if (selectedIds.length !== 1) return null
  const shape = page.shapes[selectedIds[0]]
  return shape?.type === 'line' ? shape : null
}

export function getLineEndPoint(line: LineShape, end: LineEnd) {
  return end === 'start'
    ? { x: line.x1, y: line.y1 }
    : { x: line.x2, y: line.y2 }
}

export function findLineEndAt(
  line: LineShape,
  x: number,
  y: number,
  unitsPerPixel: number,
): LineEnd | null {
  const reach = HANDLE_GRAB_PX * unitsPerPixel
  const ends: LineEnd[] = ['end', 'start']
  return (
    ends.find((end) => {
      const point = getLineEndPoint(line, end)
      return Math.hypot(point.x - x, point.y - y) <= reach
    }) ?? null
  )
}
