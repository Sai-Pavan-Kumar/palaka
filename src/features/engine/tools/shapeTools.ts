import { editCurrentPage, getCurrentPage, insertShape } from '../boardActions'
import { useEngineStore } from '../engineStore'
import { replaceShapes } from '../model/documentOps'
import { createGeo, createLine } from '../model/shapeFactory'
import type { GeoKind, GeoShape, LineShape } from '../model/types'
import { useSessionStore } from '../sessionStore'
import type { BoardPointer, ToolHandler } from './toolTypes'

// A click without a drag still makes a usable shape of this size.
const DEFAULT_GEO_SIZE = { w: 240, h: 160 }
// Under this many screen pixels of drag, the press counts as a click.
const CLICK_SLOP_PX = 4
// Shift snaps lines to 15° steps: horizontal, vertical and diagonals.
const ANGLE_SNAP = Math.PI / 12

function last(samples: BoardPointer[]): BoardPointer {
  return samples[samples.length - 1]
}

function geoBox(start: BoardPointer, end: BoardPointer) {
  let w = end.x - start.x
  let h = end.y - start.y
  if (end.shiftKey) {
    const side = Math.max(Math.abs(w), Math.abs(h))
    w = Math.sign(w || 1) * side
    h = Math.sign(h || 1) * side
  }
  return {
    x: Math.min(start.x, start.x + w),
    y: Math.min(start.y, start.y + h),
    w: Math.abs(w),
    h: Math.abs(h),
  }
}

function snapEnd(start: BoardPointer, end: BoardPointer) {
  if (!end.shiftKey) return { x: end.x, y: end.y }
  const length = Math.hypot(end.x - start.x, end.y - start.y)
  const angle = Math.atan2(end.y - start.y, end.x - start.x)
  const snapped = Math.round(angle / ANGLE_SNAP) * ANGLE_SNAP
  return {
    x: start.x + Math.cos(snapped) * length,
    y: start.y + Math.sin(snapped) * length,
  }
}

function isClick(start: BoardPointer, end: BoardPointer): boolean {
  const dragPx =
    Math.hypot(end.x - start.x, end.y - start.y) / end.unitsPerPixel
  return dragPx < CLICK_SLOP_PX
}

function updateLive<S extends GeoShape | LineShape>(
  id: string,
  recipe: (shape: S) => S,
) {
  const saved = getCurrentPage().shapes[id] as S | undefined
  if (saved) editCurrentPage((page) => replaceShapes(page, [recipe(saved)]))
}

export function createGeoTool(geo: GeoKind): ToolHandler {
  return {
    start: (start) => {
      const { style } = useSessionStore.getState()
      const shape = createGeo(
        geo,
        { x: start.x, y: start.y, w: 1, h: 1 },
        style,
      )
      let end = start
      useEngineStore.getState().beginChange()
      insertShape(shape)
      return {
        move: (samples) => {
          end = last(samples)
          updateLive<GeoShape>(shape.id, (s) => ({
            ...s,
            ...geoBox(start, end),
          }))
        },
        end: () => {
          if (isClick(start, end)) {
            const { w, h } = DEFAULT_GEO_SIZE
            updateLive<GeoShape>(shape.id, (s) => ({
              ...s,
              x: start.x - w / 2,
              y: start.y - h / 2,
              w,
              h,
            }))
          }
          useEngineStore.getState().endChange()
        },
      }
    },
  }
}

// A click without a drag would make a zero-length line, so it is dropped.
export function createLineTool(arrowhead: boolean): ToolHandler {
  return {
    start: (start) => {
      const { style } = useSessionStore.getState()
      const shape = createLine(start, arrowhead, style)
      let end = start
      useEngineStore.getState().beginChange()
      insertShape(shape)
      return {
        move: (samples) => {
          end = last(samples)
          const tip = snapEnd(start, end)
          updateLive<LineShape>(shape.id, (s) => ({
            ...s,
            x2: tip.x,
            y2: tip.y,
          }))
        },
        end: () => {
          const store = useEngineStore.getState()
          if (isClick(start, end) && store.changeBase) {
            store.updateDoc(() => store.changeBase!)
          }
          store.endChange()
        },
      }
    },
  }
}
