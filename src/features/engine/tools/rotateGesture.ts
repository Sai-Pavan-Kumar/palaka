import { editCurrentPage } from '../boardActions'
import { useEngineStore } from '../engineStore'
import { replaceShapes } from '../model/documentOps'
import { getBoundsCentre } from '../model/geometry'
import { rotateShapeAround } from '../model/transform'
import type { Point } from '../model/types'
import { setSession } from '../sessionStore'
import { selectedShapes } from './selectGestures'
import type { SelectionFrame } from './selectionHandles'
import type { BoardPointer, ToolGesture } from './toolTypes'

const SHIFT_STEP_DEGREES = 15
const RIGHT_ANGLE_DEGREES = 90
// Close to straight it clicks in, so undoing a tilt by hand lands on exactly 0.
const RIGHT_ANGLE_PULL_DEGREES = 3

function angleFrom(centre: Point, point: Point) {
  return (Math.atan2(point.y - centre.y, point.x - centre.x) * 180) / Math.PI
}

export function snapAngle(degrees: number, toSteps: boolean): number {
  if (toSteps) {
    return Math.round(degrees / SHIFT_STEP_DEGREES) * SHIFT_STEP_DEGREES
  }
  const nearest =
    Math.round(degrees / RIGHT_ANGLE_DEGREES) * RIGHT_ANGLE_DEGREES
  return Math.abs(degrees - nearest) <= RIGHT_ANGLE_PULL_DEGREES
    ? nearest
    : degrees
}

// Shapes are recomputed from their drag-start copies on every move, so
// rounding never piles up during a long drag.
export function startRotateGesture(
  frame: SelectionFrame,
  start: BoardPointer,
): ToolGesture {
  const originals = selectedShapes()
  if (originals.some((shape) => shape.locked)) {
    return { move: () => {}, end: () => {} }
  }
  const pivot = getBoundsCentre(frame.bounds)
  const startAngle = angleFrom(pivot, start)
  useEngineStore.getState().beginChange()
  return {
    move: (samples) => {
      const pointer = samples[samples.length - 1]
      const raw = frame.rotation + angleFrom(pivot, pointer) - startAngle
      const rotation = snapAngle(raw, pointer.shiftKey)
      const turned = originals.map((shape) =>
        rotateShapeAround(shape, pivot, rotation - frame.rotation),
      )
      editCurrentPage((page) => replaceShapes(page, turned))
      setSession({ rotatingFrame: { bounds: frame.bounds, rotation } })
    },
    end: () => {
      setSession({ rotatingFrame: null })
      useEngineStore.getState().endChange()
    },
  }
}
