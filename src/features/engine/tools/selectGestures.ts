import { editCurrentPage, getCurrentPage } from '../boardActions'
import { useEngineStore } from '../engineStore'
import { getShapesInOrder, replaceShapes } from '../model/documentOps'
import {
  boundsFromCorners,
  getShapeBounds,
  isBoundsInside,
} from '../model/geometry'
import { scaleShape, translateShape } from '../model/transform'
import { detachLine } from '../model/connectors'
import type { Binding, Bounds, LineShape } from '../model/types'
import { selectShapes, setSession, useSessionStore } from '../sessionStore'
import { computeSnap } from '../model/snapGuides'
import {
  getCornerPoint,
  getOppositeCorner,
  getSelectionBounds,
  type HandleCorner,
} from './selectionHandles'
import type { BoardPointer, ToolGesture } from './toolTypes'

// Below this, a resize would flatten shapes into an unrecoverable line.
const MIN_SCALE = 0.02
// A hand never holds perfectly still; under this many screen pixels a press
// is a click, not a drag.
const CLICK_SLOP_PX = 3

function last(samples: BoardPointer[]): BoardPointer {
  return samples[samples.length - 1]
}

function clampScale(scale: number): number {
  const sign = scale < 0 ? -1 : 1
  return sign * Math.max(MIN_SCALE, Math.abs(scale))
}

// A connector moved or resized on its own was moved on purpose, so its ends
// let go of shapes that stay behind. Moved together with its blocks, it
// keeps them.
function selectedShapes() {
  const { selectedIds } = useSessionStore.getState()
  const selected = new Set(selectedIds)
  return getShapesInOrder(getCurrentPage(), selectedIds).map((shape) =>
    shape.type === 'line' ? releaseUnselectedEnds(shape, selected) : shape,
  )
}

function releaseUnselectedEnds(line: LineShape, selected: Set<string>) {
  const keep = (binding?: Binding) =>
    binding && selected.has(binding.shapeId) ? binding : undefined
  return {
    ...detachLine(line),
    ...(keep(line.startBinding) && { startBinding: line.startBinding }),
    ...(keep(line.endBinding) && { endBinding: line.endBinding }),
  }
}

function applyMoveSnap(
  origBounds: Bounds | null,
  dx: number,
  dy: number,
  pointer: BoardPointer,
  otherBoundsList: Bounds[],
) {
  if (!origBounds || pointer.altKey) {
    setSession({ snapGuides: null })
    return { dx, dy }
  }
  const candidate: Bounds = {
    minX: origBounds.minX + dx,
    maxX: origBounds.maxX + dx,
    minY: origBounds.minY + dy,
    maxY: origBounds.maxY + dy,
  }
  const snap = computeSnap(
    candidate,
    otherBoundsList,
    8 * pointer.unitsPerPixel,
  )
  setSession({ snapGuides: snap.guides.length > 0 ? snap.guides : null })
  return { dx: dx + snap.dx, dy: dy + snap.dy }
}

// Shapes are recomputed from their drag-start copies on every move, so
// rounding never piles up during a long drag.
export function startMoveGesture(
  start: BoardPointer,
  onClick: () => void,
): ToolGesture {
  const originals = selectedShapes()
  const movable = originals.filter((shape) => !shape.locked)
  const page = getCurrentPage()
  const { selectedIds } = useSessionStore.getState()
  const otherBoundsList = page.order
    .filter((id) => !selectedIds.includes(id))
    .map((id) => getShapeBounds(page.shapes[id]))
  const origBounds =
    movable.length > 0
      ? getSelectionBounds(
          page,
          movable.map((s) => s.id),
        )
      : null
  let hasMoved = false
  if (movable.length > 0) useEngineStore.getState().beginChange()
  return {
    move: (samples) => {
      if (movable.length === 0) return
      const pointer = last(samples)
      const rawDx = pointer.x - start.x
      const rawDy = pointer.y - start.y
      hasMoved ||=
        Math.hypot(rawDx, rawDy) > CLICK_SLOP_PX * pointer.unitsPerPixel
      if (!hasMoved) return
      const { dx, dy } = applyMoveSnap(
        origBounds,
        rawDx,
        rawDy,
        pointer,
        otherBoundsList,
      )
      const moved = movable.map((shape) => translateShape(shape, dx, dy))
      editCurrentPage((p) => replaceShapes(p, moved))
    },
    end: () => {
      setSession({ snapGuides: null })
      if (movable.length > 0) useEngineStore.getState().endChange()
      if (!hasMoved) onClick()
    },
  }
}

// Text cannot stretch and photos should not, so a selection holding either
// always keeps its proportions.
export function startResizeGesture(
  bounds: Bounds,
  corner: HandleCorner,
): ToolGesture {
  const originals = selectedShapes()
  if (originals.some((s) => s.locked)) {
    return { move: () => {}, end: () => {} }
  }
  const keepsRatio = originals.some(
    (s) => s.type === 'text' || s.type === 'image' || s.type === 'table',
  )
  const anchor = getCornerPoint(bounds, getOppositeCorner(corner))
  const handle = getCornerPoint(bounds, corner)
  useEngineStore.getState().beginChange()
  return {
    move: (samples) => {
      const pointer = last(samples)
      let scaleX = clampScale((pointer.x - anchor.x) / (handle.x - anchor.x))
      let scaleY = clampScale((pointer.y - anchor.y) / (handle.y - anchor.y))
      if (pointer.shiftKey || keepsRatio) {
        const uniform = Math.max(Math.abs(scaleX), Math.abs(scaleY))
        scaleX = Math.sign(scaleX) * uniform
        scaleY = Math.sign(scaleY) * uniform
      }
      const transform = { originX: anchor.x, originY: anchor.y, scaleX, scaleY }
      const scaled = originals.map((shape) => scaleShape(shape, transform))
      editCurrentPage((page) => replaceShapes(page, scaled))
    },
    end: () => useEngineStore.getState().endChange(),
  }
}

// Marquee selects what lies fully inside it: predictable, nothing grabbed by
// accident because one stray line crossed the box.
export function startMarqueeGesture(start: BoardPointer): ToolGesture {
  const baseSelection = start.shiftKey
    ? useSessionStore.getState().selectedIds
    : []
  selectShapes(baseSelection)
  return {
    move: (samples) => {
      const pointer = last(samples)
      const marquee = boundsFromCorners(start.x, start.y, pointer.x, pointer.y)
      const page = getCurrentPage()
      const inside = page.order.filter((id) =>
        isBoundsInside(getShapeBounds(page.shapes[id]), marquee),
      )
      setSession({
        marquee,
        selectedIds: [...new Set([...baseSelection, ...inside])],
      })
    },
    end: () => setSession({ marquee: null }),
  }
}
