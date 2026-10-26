import { editCurrentPage, getCurrentPage, insertShape } from '../boardActions'
import { useEngineStore } from '../engineStore'
import { DEFAULT_BLOCK_SIZE, MIN_BLOCK_SIZE } from '../model/blockCatalog'
import { bindingAt, findBindTarget } from '../model/connectors'
import { replaceShapes } from '../model/documentOps'
import {
  createBlock,
  createGeo,
  createLine,
  type ShapeStyle,
} from '../model/shapeFactory'
import type {
  BlockShape,
  GeoKind,
  GeoShape,
  LineShape,
  Point,
} from '../model/types'
import { setSession, useSessionStore } from '../sessionStore'
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

export function snapEnd(start: Point, end: BoardPointer) {
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

type BoxShape = GeoShape | BlockShape
type Box = { x: number; y: number; w: number; h: number }

function updateLive<S extends BoxShape | LineShape>(
  id: string,
  recipe: (shape: S) => S,
) {
  const saved = getCurrentPage().shapes[id] as S | undefined
  if (saved) editCurrentPage((page) => replaceShapes(page, [recipe(saved)]))
}

// Boxes (geo shapes and blocks) are dragged out from a corner; a plain
// click drops one of the default size centred on the click.
function createBoxTool(
  make: (box: Box, style: ShapeStyle) => BoxShape,
  defaultSize: { w: number; h: number },
  minSize = { w: 1, h: 1 },
): ToolHandler {
  return {
    start: (start) => {
      const { style } = useSessionStore.getState()
      const shape = make({ x: start.x, y: start.y, w: 1, h: 1 }, style)
      let end = start
      useEngineStore.getState().beginChange()
      insertShape(shape)
      return {
        move: (samples) => {
          end = last(samples)
          updateLive<BoxShape>(shape.id, (s) => ({
            ...s,
            ...geoBox(start, end),
          }))
        },
        end: () => {
          if (isClick(start, end)) {
            const { w, h } = defaultSize
            updateLive<BoxShape>(shape.id, (s) => ({
              ...s,
              x: start.x - w / 2,
              y: start.y - h / 2,
              w,
              h,
            }))
          } else {
            updateLive<BoxShape>(shape.id, (s) => ({
              ...s,
              w: Math.max(s.w, minSize.w),
              h: Math.max(s.h, minSize.h),
            }))
          }
          useEngineStore.getState().endChange()
        },
      }
    },
  }
}

export function createGeoTool(geo: GeoKind): ToolHandler {
  return createBoxTool(
    (box, style) => createGeo(geo, box, style),
    DEFAULT_GEO_SIZE,
  )
}

// The kind is read on each press, so picking another block in the catalog
// changes what the next click drops.
export const blockTool = createBoxTool(
  (box, style) => {
    const { blockKind, blockIcon } = useSessionStore.getState()
    const block = createBlock(blockKind, box, style)
    return blockIcon
      ? { ...block, icon: blockIcon.id, label: blockIcon.label }
      : block
  },
  DEFAULT_BLOCK_SIZE,
  MIN_BLOCK_SIZE,
)

// Screen pixels around a shape that still count as "on it" for an arrow
// end, so connecting blocks does not need pixel-perfect aim.
const BIND_SNAP_PX = 28

export function bindTargetAt(
  pointer: BoardPointer,
  at: Point,
  excludeId?: string,
) {
  if (pointer.altKey) return null
  const reach = BIND_SNAP_PX * pointer.unitsPerPixel
  return findBindTarget(getCurrentPage(), at, excludeId, reach)
}

// A click without a drag would make a zero-length line, so it is dropped.
export function createLineTool(arrowhead: boolean): ToolHandler {
  return {
    start: (start) => {
      const { style } = useSessionStore.getState()
      const from = bindTargetAt(start, start)
      const shape: LineShape = {
        ...createLine(start, arrowhead, style),
        ...(from && { startBinding: bindingAt(from, start) }),
      }
      let end = start
      setSession({ bindTargetId: from?.id ?? null })
      useEngineStore.getState().beginChange()
      insertShape(shape)
      return {
        move: (samples) => {
          end = last(samples)
          const tip = snapEnd(start, end)
          const to = bindTargetAt(end, tip, from?.id)
          setSession({ bindTargetId: to?.id ?? from?.id ?? null })
          updateLive<LineShape>(shape.id, (s) => ({
            ...s,
            x2: tip.x,
            y2: tip.y,
            endBinding: to ? bindingAt(to, tip) : undefined,
          }))
        },
        end: () => {
          setSession({ bindTargetId: null })
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
