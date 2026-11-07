import { getShapesInOrder } from '../model/documentOps'
import {
  getBoundsCentre,
  getLocalBounds,
  getRotation,
  getShapeBounds,
  unionBounds,
} from '../model/geometry'
import { rotatePoint } from '../model/rotation'
import type { Bounds, LineShape, Page, Point } from '../model/types'

// Screen pixels: handles look and grab the same at any board size.
export const HANDLE_SIZE_PX = 10
const ROTATE_HANDLE_GAP_PX = 28
// A fingertip covers far more than a mouse tip, so the same small handle needs
// a 44px grab area on touch screens.
const FINGER_GRAB_PX = 22
const isCoarsePointer = () => window.matchMedia('(pointer: coarse)').matches
const handleGrabPx = () => (isCoarsePointer() ? FINGER_GRAB_PX : 12)
const rotateGrabPx = () => (isCoarsePointer() ? FINGER_GRAB_PX : 14)

export type HandleCorner = 'nw' | 'ne' | 'sw' | 'se'

export const HANDLE_CORNERS: HandleCorner[] = ['nw', 'ne', 'sw', 'se']

export function getSelectionBounds(
  page: Page,
  selectedIds: string[],
): Bounds | null {
  return unionBounds(getShapesInOrder(page, selectedIds).map(getShapeBounds))
}

// One shape's frame turns with it. A group's frame stays axis-aligned, because
// its members can each have a different angle.
export type SelectionFrame = { bounds: Bounds; rotation: number }

export function getSelectionFrame(
  page: Page,
  selectedIds: string[],
): SelectionFrame | null {
  const shapes = getShapesInOrder(page, selectedIds)
  if (shapes.length === 1) {
    return {
      bounds: getLocalBounds(shapes[0]),
      rotation: getRotation(shapes[0]),
    }
  }
  const bounds = unionBounds(shapes.map(getShapeBounds))
  return bounds && { bounds, rotation: 0 }
}

export function toFrameSpace(frame: SelectionFrame, point: Point): Point {
  return rotatePoint(point, getBoundsCentre(frame.bounds), -frame.rotation)
}

export function getRotateHandlePoint(bounds: Bounds, unitsPerPixel: number) {
  return {
    x: (bounds.minX + bounds.maxX) / 2,
    y: bounds.minY - ROTATE_HANDLE_GAP_PX * unitsPerPixel,
  }
}

export function isOnRotateHandle(
  frame: SelectionFrame,
  point: Point,
  unitsPerPixel: number,
): boolean {
  const local = toFrameSpace(frame, point)
  const handle = getRotateHandlePoint(frame.bounds, unitsPerPixel)
  const reach = rotateGrabPx() * unitsPerPixel
  return Math.hypot(local.x - handle.x, local.y - handle.y) <= reach
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
  frame: SelectionFrame,
  x: number,
  y: number,
  unitsPerPixel: number,
): HandleCorner | null {
  const reach = handleGrabPx() * unitsPerPixel
  const local = toFrameSpace(frame, { x, y })
  return (
    HANDLE_CORNERS.find((corner) => {
      const point = getCornerPoint(frame.bounds, corner)
      return (
        Math.abs(point.x - local.x) <= reach &&
        Math.abs(point.y - local.y) <= reach
      )
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
  const reach = handleGrabPx() * unitsPerPixel
  const ends: LineEnd[] = ['end', 'start']
  return (
    ends.find((end) => {
      const point = getLineEndPoint(line, end)
      return Math.hypot(point.x - x, point.y - y) <= reach
    }) ?? null
  )
}
