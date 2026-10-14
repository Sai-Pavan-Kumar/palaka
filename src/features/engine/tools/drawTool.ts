import { cleanStroke } from '../../cleanup/cleanStroke'
import { editCurrentPage, getCurrentPage, insertShape } from '../boardActions'
import { useEngineStore } from '../engineStore'
import { replaceShapes } from '../model/documentOps'
import { createStroke } from '../model/shapeFactory'
import type { StrokeKind, StrokePoint, StrokeShape } from '../model/types'
import { useSessionStore } from '../sessionStore'
import type { BoardPointer, ToolHandler } from './toolTypes'

function toStrokePoint(pointer: BoardPointer): StrokePoint {
  return [pointer.x, pointer.y, pointer.pressure]
}

// "Clean shapes" only ever touches the pen, never the highlighter, and only
// when the result is clearly a box, oval or line.
function cleanUpIfAsked(stroke: StrokeShape): void {
  const { isShapeCleanupOn } = useSessionStore.getState()
  if (!isShapeCleanupOn || stroke.kind !== 'pen') return
  const saved = getCurrentPage().shapes[stroke.id]
  if (saved?.type !== 'stroke') return
  const clean = cleanStroke(saved)
  if (clean) editCurrentPage((page) => replaceShapes(page, [clean]))
}

// Pen and highlighter share one tool; only the rendering differs.
export function createDrawTool(kind: StrokeKind): ToolHandler {
  return {
    start: (pointer) => {
      const { style } = useSessionStore.getState()
      let stroke = createStroke(
        kind,
        toStrokePoint(pointer),
        pointer.isPen,
        style,
      )
      useEngineStore.getState().beginChange()
      insertShape(stroke)
      return {
        move: (samples) => {
          const saved = getCurrentPage().shapes[stroke.id]
          if (saved?.type !== 'stroke') return
          stroke = {
            ...saved,
            points: [...saved.points, ...samples.map(toStrokePoint)],
          }
          const current = stroke
          editCurrentPage((page) => replaceShapes(page, [current]))
        },
        end: () => {
          cleanUpIfAsked(stroke)
          useEngineStore.getState().endChange()
        },
      }
    },
  }
}
