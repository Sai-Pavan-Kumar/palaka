import { getCurrentPage, insertShape } from '../boardActions'
import { useEngineStore } from '../engineStore'
import { useLaserStore } from '../laserStore'
import { getOrderedShapes } from '../model/documentOps'
import { hitTestShape } from '../model/hitTest'
import { getFontPx } from '../model/textMetrics'
import { createText } from '../model/shapeFactory'
import { useSessionStore } from '../sessionStore'
import { startTextEditing } from '../textEditing'
import type { ToolGesture, ToolHandler } from './toolTypes'

const IDLE_GESTURE: ToolGesture = { move: () => {}, end: () => {} }

// Clicking existing text edits it; clicking empty board starts a new box
// whose first line sits where you clicked.
export const textTool: ToolHandler = {
  start: (pointer) => {
    const existing = getOrderedShapes(getCurrentPage())
      .reverse()
      .find(
        (shape) =>
          shape.type === 'text' && hitTestShape(shape, pointer.x, pointer.y, 0),
      )
    if (existing) {
      startTextEditing(existing.id)
      return IDLE_GESTURE
    }
    const { style } = useSessionStore.getState()
    const draft = createText({ x: pointer.x, y: pointer.y }, style)
    const shape = { ...draft, y: pointer.y - getFontPx(draft) / 2 }
    useEngineStore.getState().beginChange()
    insertShape(shape)
    startTextEditing(shape.id)
    return IDLE_GESTURE
  },
}

export const laserTool: ToolHandler = {
  start: (pointer) => {
    const { addPoints } = useLaserStore.getState()
    addPoints([pointer])
    return {
      move: (samples) => addPoints(samples),
      end: () => {},
    }
  },
}
