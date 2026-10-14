import { commitCurrentPage, getCurrentPage } from '../engine/boardActions'
import { useEngineStore } from '../engine/engineStore'
import {
  getHighestStep,
  getSteppedShapes,
  normalizeSteps,
} from '../engine/model/revealSteps'
import type { Page } from '../engine/model/types'
import { setSession, useSessionStore } from '../engine/sessionStore'
import { DRAW_ON_SAFETY_MS } from '../engine/render/drawOnPlan'
import { finishTextEditing } from '../engine/textEditing'

export function getStepCount(page: Page): number {
  return getSteppedShapes(page).length
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

export function moveRevealStep(shapeId: string, offset: 1 | -1): void {
  const ordered = getSteppedShapes(getCurrentPage())
  const index = ordered.findIndex((s) => s.id === shapeId)
  const shape = ordered[index]
  const neighbour = ordered[index + offset]
  if (!shape || !neighbour) return
  commitCurrentPage((page) => ({
    ...page,
    shapes: {
      ...page.shapes,
      [shape.id]: { ...shape, revealStep: neighbour.revealStep },
      [neighbour.id]: { ...neighbour, revealStep: shape.revealStep },
    },
  }))
}

export function toggleAlwaysVisible(shapeId: string): void {
  commitCurrentPage((page) => {
    const shape = page.shapes[shapeId]
    if (!shape) return page
    const { revealStep, ...rest } = shape
    const next =
      revealStep === undefined
        ? { ...rest, revealStep: getHighestStep(page) + 1 }
        : rest
    return {
      ...page,
      shapes: { ...page.shapes, [shapeId]: next as typeof shape },
    }
  })
}
