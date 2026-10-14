import type { Aspect, Paper } from '../engine/model/types'
import { useEngineStore } from '../engine/engineStore'
import {
  createPage,
  insertPageAfter,
  removePage,
} from '../engine/model/documentOps'
import { goToPage, useSessionStore } from '../engine/sessionStore'
import { finishTextEditing } from '../engine/textEditing'

export function switchToPage(pageId: string): void {
  finishTextEditing()
  goToPage(pageId)
}

export function goToPageOffset(offset: 1 | -1): void {
  const { pages } = useEngineStore.getState().doc
  const index = pages.findIndex(
    (page) => page.id === useSessionStore.getState().pageId,
  )
  const target = pages[index + offset]
  if (target) switchToPage(target.id)
}

export function addPageAfterCurrent(): void {
  const { doc, commit } = useEngineStore.getState()
  const page = createPage(`Page ${doc.pages.length + 1}`)
  finishTextEditing()
  commit((current) =>
    insertPageAfter(current, useSessionStore.getState().pageId, page),
  )
  goToPage(page.id)
}

// Undo (Ctrl Z) brings a deleted page back, so no confirm dialog is needed.
export function deleteCurrentPage(): void {
  const { doc, commit } = useEngineStore.getState()
  if (doc.pages.length <= 1) return
  finishTextEditing()
  commit((current) => removePage(current, useSessionStore.getState().pageId))
}

// Undoable, like any other board edit.
export function setAspect(aspect: Aspect): void {
  const { doc, commit } = useEngineStore.getState()
  if (doc.aspect !== aspect) commit((current) => ({ ...current, aspect }))
}

// Paper is a board setting, so changing it is undoable like any edit.
export function setPaper(patch: Partial<Paper>): void {
  const { commit } = useEngineStore.getState()
  commit((current) => ({ ...current, paper: { ...current.paper, ...patch } }))
}
