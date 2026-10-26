import { commitCurrentPage } from '../engine/boardActions'
import { isEffect } from '../engine/model/effects'
import { getHighestStep } from '../engine/model/revealSteps'
import type {
  AnimSpeed,
  EnterStyle,
  ExitStyle,
  Page,
  Shape,
} from '../engine/model/types'
import { useSessionStore } from '../engine/sessionStore'

type Recipe = (shape: Shape, page: Page) => Shape

// Effects (highlights, query states) have no ink, so there is nothing to
// animate on them.
export function getAnimatable(page: Page, ids: string[]): Shape[] {
  return ids
    .map((id) => page.shapes[id])
    .filter((shape): shape is Shape => !!shape && !isEffect(shape))
}

// Shapes are changed one by one against the page as it grows, so several
// selected shapes that gain an exit get steps 7, 8, 9 rather than all 7.
function editSelected(recipe: Recipe): void {
  const { selectedIds } = useSessionStore.getState()
  commitCurrentPage((page) => {
    let next = page
    for (const shape of getAnimatable(page, selectedIds)) {
      const changed = recipe(next.shapes[shape.id], next)
      if (changed === shape) continue
      next = { ...next, shapes: { ...next.shapes, [shape.id]: changed } }
    }
    return next
  })
}

export function setEnter(enter: EnterStyle): void {
  editSelected((shape) => {
    const { enter: _old, ...rest } = shape
    return (enter === 'draw' ? rest : { ...rest, enter }) as Shape
  })
}

export function setExit(style: ExitStyle | null): void {
  editSelected((shape, page) => {
    const { exit, ...rest } = shape
    if (style === null) return rest as Shape
    const step = exit?.step ?? getHighestStep(page) + 1
    return { ...shape, exit: { style, step } }
  })
}

export function setPulse(on: boolean): void {
  editSelected((shape, page) => {
    const { pulseStep, ...rest } = shape
    if (!on) return rest as Shape
    return { ...shape, pulseStep: pulseStep ?? getHighestStep(page) + 1 }
  })
}

export function setAnimSpeed(speed: AnimSpeed | 'normal'): void {
  editSelected((shape) => {
    const { animSpeed: _old, ...rest } = shape
    return (speed === 'normal' ? rest : { ...rest, animSpeed: speed }) as Shape
  })
}
