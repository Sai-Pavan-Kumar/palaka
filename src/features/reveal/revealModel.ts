import { commitCurrentPage, getCurrentPage } from '../engine/boardActions'
import { useEngineStore } from '../engine/engineStore'
import {
  getHighestStep,
  getStepItems,
  getStepOf,
  normalizeSteps,
  withStep,
  type StepKind,
} from '../engine/model/revealSteps'
import type { Page } from '../engine/model/types'
import { setSession, useSessionStore } from '../engine/sessionStore'
import { DRAW_ON_SAFETY_MS } from '../engine/render/drawOnPlan'
import { finishTextEditing } from '../engine/textEditing'

export function getStepCount(page: Page): number {
  return getStepItems(page).length
}

// Renumbering on entry is housekeeping, not an edit, so it skips undo: Ctrl Z
// right after presenting should undo your last drawing, not the numbering.
export function setPresenting(presenting: boolean): void {
  if (presenting) {
    finishTextEditing()
    const store = useEngineStore.getState()
    const normalized = store.doc.pages.map(normalizeSteps)
    if (normalized.some((page, i) => page !== store.doc.pages[i])) {
      store.updateDoc((doc) => ({ ...doc, pages: normalized }))
    }
  }
  setSession({
    presenting,
    revealedUpTo: {},
    selectedIds: [],
    drawOnStep: null,
  })
}

export function stepReveal(direction: 1 | -1): void {
  const { revealedUpTo, pageId } = useSessionStore.getState()
  const current = revealedUpTo[pageId] ?? 0
  const next = Math.min(
    Math.max(current + direction, 0),
    getStepCount(getCurrentPage()),
  )
  if (next === current) return
  const drawOnStep = direction === 1 ? { pageId, step: next } : null
  // Only a step forward draws in; stepping back simply hides.
  setSession({ revealedUpTo: { ...revealedUpTo, [pageId]: next }, drawOnStep })
  if (drawOnStep) {
    // Safety net: if the animation never runs (a paused tab, a browser
    // quirk), the shape still appears in full instead of staying hidden.
    window.setTimeout(() => {
      if (useSessionStore.getState().drawOnStep === drawOnStep) {
        setSession({ drawOnStep: null })
      }
    }, DRAW_ON_SAFETY_MS)
  }
}

// Swaps step numbers with the neighbour. Both may be steps of the same
// connector (its arrow and its flow), so the second write reads the shape
// the first one already changed.
export function moveRevealStep(
  shapeId: string,
  kind: StepKind,
  offset: 1 | -1,
): void {
  const ordered = getStepItems(getCurrentPage())
  const index = ordered.findIndex(
    (item) => item.shape.id === shapeId && item.kind === kind,
  )
  const item = ordered[index]
  const neighbour = ordered[index + offset]
  if (!item || !neighbour) return
  commitCurrentPage((page) => {
    const shapes = { ...page.shapes }
    shapes[item.shape.id] = withStep(
      shapes[item.shape.id],
      item.kind,
      neighbour.step,
    )
    shapes[neighbour.shape.id] = withStep(
      shapes[neighbour.shape.id],
      neighbour.kind,
      item.step,
    )
    return { ...page, shapes }
  })
}

export function toggleAlwaysVisible(shapeId: string, kind: StepKind): void {
  commitCurrentPage((page) => {
    const shape = page.shapes[shapeId]
    if (!shape) return page
    const step =
      getStepOf(shape, kind) === undefined
        ? getHighestStep(page) + 1
        : undefined
    return {
      ...page,
      shapes: { ...page.shapes, [shapeId]: withStep(shape, kind, step) },
    }
  })
}
