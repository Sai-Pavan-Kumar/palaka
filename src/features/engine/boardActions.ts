import { useEngineStore } from './engineStore'
import {
  addShape,
  findPage,
  getShapesInOrder,
  moveToEdge,
  removeShapes,
  updatePage,
} from './model/documentOps'
import { withRevealStep } from './model/revealSteps'
import type { ShapeStyle } from './model/shapeFactory'
import { applyStylePatch } from './model/stylePatch'
import { translateShape } from './model/transform'
import type { Page, Shape } from './model/types'
import { selectShapes, setSession, useSessionStore } from './sessionStore'

// Copies land down-right of the original, clearly separate but close by.
const DUPLICATE_OFFSET = 32

type PageRecipe = (page: Page) => Page

export function getCurrentPage(): Page {
  const { doc } = useEngineStore.getState()
  return findPage(doc, useSessionStore.getState().pageId) ?? doc.pages[0]
}

// Live edit inside an open gesture (no history entry of its own).
export function editCurrentPage(recipe: PageRecipe): void {
  const { pageId } = useSessionStore.getState()
  useEngineStore.getState().updateDoc((doc) => updatePage(doc, pageId, recipe))
}

// A complete, single-step edit.
export function commitCurrentPage(recipe: PageRecipe): void {
  const { pageId } = useSessionStore.getState()
  useEngineStore.getState().commit((doc) => updatePage(doc, pageId, recipe))
}

// Every new shape goes through here, so reveal steps are never forgotten.
export function insertShape(shape: Shape): void {
  const { presenting } = useSessionStore.getState()
  editCurrentPage((page) =>
    addShape(page, withRevealStep(page, shape, presenting)),
  )
}

export function deleteSelected(): void {
  const { selectedIds } = useSessionStore.getState()
  if (selectedIds.length === 0) return
  commitCurrentPage((page) => removeShapes(page, selectedIds))
  selectShapes([])
}

export function duplicateSelected(): void {
  const { selectedIds, presenting } = useSessionStore.getState()
  const originals = getShapesInOrder(getCurrentPage(), selectedIds)
  if (originals.length === 0) return
  const copies = originals.map((shape) => ({
    ...translateShape(shape, DUPLICATE_OFFSET, DUPLICATE_OFFSET),
    id: crypto.randomUUID(),
  }))
  commitCurrentPage((page) =>
    copies.reduce(
      (next, copy) => addShape(next, withRevealStep(next, copy, presenting)),
      page,
    ),
  )
  selectShapes(copies.map((copy) => copy.id))
}

export function moveSelectedToEdge(edge: 'front' | 'back'): void {
  const { selectedIds } = useSessionStore.getState()
  if (selectedIds.length === 0) return
  commitCurrentPage((page) => moveToEdge(page, selectedIds, edge))
}

export function selectAllOnPage(): void {
  setSession({ tool: 'select' })
  selectShapes([...getCurrentPage().order])
}

// Styles apply to what is selected and to whatever is drawn next.
export function applyStyle(patch: Partial<ShapeStyle>): void {
  const { selectedIds, style } = useSessionStore.getState()
  setSession({ style: { ...style, ...patch } })
  const targets = getShapesInOrder(getCurrentPage(), selectedIds)
  if (targets.length === 0) return
  const restyled = targets.map((shape) => applyStylePatch(shape, patch))
  commitCurrentPage((page) => ({
    ...page,
    shapes: {
      ...page.shapes,
      ...Object.fromEntries(restyled.map((s) => [s.id, s])),
    },
  }))
}
