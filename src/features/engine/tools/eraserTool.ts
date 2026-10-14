import { editCurrentPage, getCurrentPage } from '../boardActions'
import { useEngineStore } from '../engineStore'
import { getOrderedShapes, removeShapes } from '../model/documentOps'
import { hitTestShape } from '../model/hitTest'
import type { StrokePoint } from '../model/types'
import { setSession } from '../sessionStore'
import type { BoardPointer, ToolHandler } from './toolTypes'

// Eraser reach in screen pixels, so it feels the same at any board size.
const ERASER_RADIUS_PX = 8
// A fast flick can jump 100 px between events; checking every few pixels
// along the jump keeps thin lines from slipping through.
const SAMPLE_STEP_PX = 4
const TRAIL_LENGTH = 12

function samplesBetween(from: BoardPointer, to: BoardPointer): BoardPointer[] {
  const distancePx = Math.hypot(to.x - from.x, to.y - from.y) / to.unitsPerPixel
  const steps = Math.max(1, Math.ceil(distancePx / SAMPLE_STEP_PX))
  return Array.from({ length: steps }, (_, i) => {
    const t = (i + 1) / steps
    return {
      ...to,
      x: from.x + (to.x - from.x) * t,
      y: from.y + (to.y - from.y) * t,
    }
  })
}

function eraseAt(points: BoardPointer[]) {
  const hitIds = getOrderedShapes(getCurrentPage())
    .filter((shape) =>
      points.some((p) =>
        hitTestShape(shape, p.x, p.y, ERASER_RADIUS_PX * p.unitsPerPixel),
      ),
    )
    .map((shape) => shape.id)
  if (hitIds.length > 0) editCurrentPage((page) => removeShapes(page, hitIds))
}

// The whole drag is one undo step, however many objects it removed.
export const eraserTool: ToolHandler = {
  start: (pointer) => {
    let last = pointer
    let trail: StrokePoint[] = [[pointer.x, pointer.y, 1]]
    useEngineStore.getState().beginChange()
    setSession({ eraserTrail: trail })
    eraseAt([pointer])
    return {
      move: (samples) => {
        const path = samples.flatMap((sample) => {
          const between = samplesBetween(last, sample)
          last = sample
          return between
        })
        eraseAt(path)
        trail = [
          ...trail,
          ...samples.map((s): StrokePoint => [s.x, s.y, 1]),
        ].slice(-TRAIL_LENGTH)
        setSession({ eraserTrail: trail })
      },
      end: () => {
        setSession({ eraserTrail: [] })
        useEngineStore.getState().endChange()
      },
    }
  },
}
