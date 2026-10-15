import { editCurrentPage } from '../boardActions'
import { useEngineStore } from '../engineStore'
import { replaceShapes } from '../model/documentOps'
import type { LineShape } from '../model/types'
import { setSession } from '../sessionStore'
import { getLineEndPoint, type LineEnd } from './selectionHandles'
import { bindTargetAt, snapEnd } from './shapeTools'
import type { ToolGesture } from './toolTypes'

// Dragging one end of an arrow: it sticks to whatever it is dropped on,
// like drawing a new one, and lets go when dropped on empty board. The
// other end keeps its block and re-aims (replaceShapes re-routes).
export function startLineEndGesture(
  line: LineShape,
  end: LineEnd,
): ToolGesture {
  const other = getLineEndPoint(line, end === 'start' ? 'end' : 'start')
  const otherBinding = end === 'start' ? line.endBinding : line.startBinding
  const bindingKey = end === 'start' ? 'startBinding' : 'endBinding'
  useEngineStore.getState().beginChange()
  return {
    move: (samples) => {
      const pointer = samples[samples.length - 1]
      const tip = snapEnd(other, pointer)
      const target = bindTargetAt(pointer, tip, otherBinding?.shapeId)
      setSession({ bindTargetId: target?.id ?? null })
      const point =
        end === 'start' ? { x1: tip.x, y1: tip.y } : { x2: tip.x, y2: tip.y }
      const moved: LineShape = {
        ...line,
        ...point,
        [bindingKey]: target ? { shapeId: target.id } : undefined,
      }
      editCurrentPage((page) => replaceShapes(page, [moved]))
    },
    end: () => {
      setSession({ bindTargetId: null })
      useEngineStore.getState().endChange()
    },
  }
}
