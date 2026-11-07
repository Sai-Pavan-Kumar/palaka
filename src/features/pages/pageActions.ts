import type { Aspect, BoardDocument, Paper } from '../engine/model/types'
import { useEngineStore } from '../engine/engineStore'
import {
  createPage,
  insertPageAfter,
  removePage,
} from '../engine/model/documentOps'
import { getPageWidth, SLIDE_SIZE } from '../engine/model/boardSpec'
import { getShapeBounds, isBoundsInside } from '../engine/model/geometry'
import { goToPage, useSessionStore } from '../engine/sessionStore'
import { useUiStore } from '../shell/uiStore'
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

export function countShapesOutside(doc: BoardDocument, aspect: Aspect): number {
  const height = SLIDE_SIZE[aspect].height
  return doc.pages.reduce((count, page) => {
    const board = {
      minX: 0,
      minY: 0,
      maxX: getPageWidth(aspect, page.frameCount ?? 1),
      maxY: height,
    }
    const outside = Object.values(page.shapes).filter(
      (shape) => !isBoundsInside(getShapeBounds(shape), board),
    )
    return count + outside.length
  }, 0)
}

// Undoable, like any other board edit. Changing shape clips whatever no longer
// fits, which looks exactly like lost work unless it is said out loud.
export function setAspect(aspect: Aspect): void {
  const { doc, commit } = useEngineStore.getState()
  if (doc.aspect === aspect) return
  commit((current) => ({ ...current, aspect }))
  const outside = countShapesOutside(doc, aspect)
  if (outside > 0) {
    useUiStore
      .getState()
      .showToast(
        `${outside} ${outside === 1 ? 'item is' : 'items are'} cut off by this board shape. Undo brings the old shape back.`,
      )
  }
}

// Paper is a board setting, so changing it is undoable like any edit.
export function setPaper(patch: Partial<Paper>): void {
  const { commit } = useEngineStore.getState()
  commit((current) => ({ ...current, paper: { ...current.paper, ...patch } }))
}

// Toggle between standard 1x (16:9) and wide 2x (32:9) sequence frame
export function togglePageFrameCount(pageId?: string): void {
  const targetId = pageId ?? useSessionStore.getState().pageId
  const { commit } = useEngineStore.getState()
  commit((current) => ({
    ...current,
    pages: current.pages.map((p) =>
      p.id === targetId ? { ...p, frameCount: p.frameCount === 2 ? 1 : 2 } : p,
    ),
  }))
}
