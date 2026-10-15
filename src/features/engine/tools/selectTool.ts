import { getCurrentPage } from '../boardActions'
import { hitTestShape } from '../model/hitTest'
import { selectShapes, useSessionStore } from '../sessionStore'
import { hasEditableLabel, startTextEditing } from '../textEditing'
import {
  startMarqueeGesture,
  startMoveGesture,
  startResizeGesture,
} from './selectGestures'
import { startLineEndGesture } from './lineEndGesture'
import {
  findHandleAt,
  findLineEndAt,
  getSelectionBounds,
  getSoloLine,
} from './selectionHandles'
import type { BoardPointer, ToolGesture, ToolHandler } from './toolTypes'

// Grab distance in screen pixels around a line.
const HIT_TOLERANCE_PX = 6
const DOUBLE_CLICK_MS = 400

const IDLE_GESTURE: ToolGesture = { move: () => {}, end: () => {} }

let lastClick = { id: '', time: 0 }

function findTopShapeAt(pointer: BoardPointer): string | null {
  const page = getCurrentPage()
  const tolerance = HIT_TOLERANCE_PX * pointer.unitsPerPixel
  for (let i = page.order.length - 1; i >= 0; i--) {
    const shape = page.shapes[page.order[i]]
    if (hitTestShape(shape, pointer.x, pointer.y, tolerance)) return shape.id
  }
  return null
}

function isDoubleClickOn(id: string): boolean {
  const now = performance.now()
  const isDouble = lastClick.id === id && now - lastClick.time < DOUBLE_CLICK_MS
  // A double-click is used up: a third quick click selects again instead of
  // reopening the editor (which then silently ate Delete and Ctrl A).
  lastClick = isDouble ? { id: '', time: 0 } : { id, time: now }
  return isDouble
}

function startOnShape(pointer: BoardPointer, id: string): ToolGesture {
  const shape = getCurrentPage().shapes[id]
  if (
    isDoubleClickOn(id) &&
    (shape.type === 'text' || hasEditableLabel(shape))
  ) {
    startTextEditing(id)
    return IDLE_GESTURE
  }
  const { selectedIds } = useSessionStore.getState()
  const wasSelected = selectedIds.includes(id)
  if (pointer.shiftKey) {
    if (wasSelected) {
      selectShapes(selectedIds.filter((selected) => selected !== id))
      return IDLE_GESTURE
    }
    selectShapes([...selectedIds, id])
  } else if (!wasSelected) {
    selectShapes([id])
  }
  // Clicking one shape of a group selection (without dragging) narrows the
  // selection to it, like every desktop design tool.
  const narrowSelection = () => {
    if (wasSelected && !pointer.shiftKey) selectShapes([id])
  }
  return startMoveGesture(pointer, narrowSelection)
}

export const selectTool: ToolHandler = {
  start: (pointer) => {
    const { selectedIds } = useSessionStore.getState()
    const soloLine = getSoloLine(getCurrentPage(), selectedIds)
    if (soloLine) {
      const end = findLineEndAt(
        soloLine,
        pointer.x,
        pointer.y,
        pointer.unitsPerPixel,
      )
      if (end) return startLineEndGesture(soloLine, end)
    }
    const bounds = soloLine
      ? null
      : getSelectionBounds(getCurrentPage(), selectedIds)
    const corner =
      bounds &&
      findHandleAt(bounds, pointer.x, pointer.y, pointer.unitsPerPixel)
    if (bounds && corner) return startResizeGesture(bounds, corner)
    const id = findTopShapeAt(pointer)
    if (id) return startOnShape(pointer, id)
    lastClick = { id: '', time: 0 }
    return startMarqueeGesture(pointer)
  },
}
