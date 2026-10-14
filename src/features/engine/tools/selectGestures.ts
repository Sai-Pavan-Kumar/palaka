import { editCurrentPage, getCurrentPage } from '../boardActions'
import { useEngineStore } from '../engineStore'
import { getShapesInOrder, replaceShapes } from '../model/documentOps'
import {
  boundsFromCorners,
  getShapeBounds,
  isBoundsInside,
} from '../model/geometry'
import { scaleShape, translateShape } from '../model/transform'
import type { Bounds } from '../model/types'
import { selectShapes, setSession, useSessionStore } from '../sessionStore'
import {
  getCornerPoint,
  getOppositeCorner,
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

function selectedShapes() {
  return getShapesInOrder(
    getCurrentPage(),
    useSessionStore.getState().selectedIds,
  )
}

// Shapes are recomputed from their drag-start copies on every move, so
// rounding never piles up during a long drag.
export function startMoveGesture(
  start: BoardPointer,
  onClick: () => void,
): ToolGesture {
  const originals = selectedShapes()
  let hasMoved = false
  useEngineStore.getState().beginChange()
  return {
    move: (samples) => {
      const pointer = last(samples)
      const dx = pointer.x - start.x
      const dy = pointer.y - start.y
      hasMoved ||= Math.hypot(dx, dy) > CLICK_SLOP_PX * pointer.unitsPerPixel
      if (!hasMoved) return
      const moved = originals.map((shape) => translateShape(shape, dx, dy))
      editCurrentPage((page) => replaceShapes(page, moved))
    },
    end: () => {
      useEngineStore.getState().endChange()
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
  const keepsRatio = originals.some(
    (s) => s.type === 'text' || s.type === 'image',
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
