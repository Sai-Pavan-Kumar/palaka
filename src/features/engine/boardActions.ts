import { useEngineStore } from './engineStore'
import { isEffect } from './model/effects'
import { remapBindings, rerouteConnectors } from './model/connectors'
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
import { publishCopy } from './systemClipboard'

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

let clipboard: Shape[] = []

export function deleteSelected(): void {
  const { selectedIds } = useSessionStore.getState()
  if (selectedIds.length === 0) return
  const page = getCurrentPage()
  const deletable = selectedIds.filter((id) => !page.shapes[id]?.locked)
  if (deletable.length === 0) return
  commitCurrentPage((p) => removeShapes(p, deletable))
  selectShapes(selectedIds.filter((id) => page.shapes[id]?.locked))
}

function cloneForPlacement(shape: Shape, idMap: Map<string, string>): Shape {
  const remapped = remapBindings(
    translateShape(shape, DUPLICATE_OFFSET, DUPLICATE_OFFSET),
    idMap,
  )
  const { revealStep: _r, ...cleanShape } = remapped
  if (cleanShape.type === 'line' && cleanShape.flow?.step !== undefined) {
    const { step: _f, ...cleanFlow } = cleanShape.flow
    return {
      ...cleanShape,
      id: idMap.get(shape.id)!,
      locked: false,
      flow: cleanFlow,
    } as Shape
  }
  return {
    ...cleanShape,
    id: idMap.get(shape.id)!,
    locked: false,
  } as Shape
}

export function duplicateSelected(): void {
  const { selectedIds, presenting } = useSessionStore.getState()
  const originals = getShapesInOrder(getCurrentPage(), selectedIds)
  if (originals.length === 0) return
  const idMap = new Map(originals.map((s) => [s.id, crypto.randomUUID()]))
  const copies = originals.map((shape) => cloneForPlacement(shape, idMap))
  commitCurrentPage((page) =>
    copies.reduce(
      (next, copy) => addShape(next, withRevealStep(next, copy, presenting)),
      page,
    ),
  )
  selectShapes(copies.map((copy) => copy.id))
}

export function copySelected(): void {
  const { selectedIds } = useSessionStore.getState()
  const originals = getShapesInOrder(getCurrentPage(), selectedIds)
  if (originals.length === 0) return
  clipboard = originals.map((shape) => structuredClone(shape))
  void publishCopy(originals, useEngineStore.getState().doc.assets)
}

export function pasteClipboard(): void {
  if (clipboard.length === 0) return
  const { presenting } = useSessionStore.getState()
  const idMap = new Map(clipboard.map((s) => [s.id, crypto.randomUUID()]))
  const copies = clipboard.map((shape) => cloneForPlacement(shape, idMap))
  commitCurrentPage((page) =>
    copies.reduce(
      (next, copy) => addShape(next, withRevealStep(next, copy, presenting)),
      page,
    ),
  )
  selectShapes(copies.map((copy) => copy.id))
  clipboard = copies.map((c) => structuredClone(c))
}

export function cutSelected(): void {
  copySelected()
  deleteSelected()
}

export function toggleLockSelected(): void {
  const { selectedIds } = useSessionStore.getState()
  const page = getCurrentPage()
  const targets = getShapesInOrder(page, selectedIds)
  if (targets.length === 0) return
  const allLocked = targets.every((s) => s.locked)
  const nextLocked = !allLocked
  commitCurrentPage((p) => ({
    ...p,
    shapes: {
      ...p.shapes,
      ...Object.fromEntries(
        targets.map((s) => [s.id, { ...s, locked: nextLocked }]),
      ),
    },
  }))
}

export function moveSelectedToEdge(edge: 'front' | 'back'): void {
  const { selectedIds } = useSessionStore.getState()
  if (selectedIds.length === 0) return
  commitCurrentPage((page) => moveToEdge(page, selectedIds, edge))
}

// Effects (highlight steps) have nothing to grab, so they stay out.
export function selectAllOnPage(): void {
  const page = getCurrentPage()
  setSession({ tool: 'select' })
  selectShapes(page.order.filter((id) => !isEffect(page.shapes[id])))
}

// Styles apply to what is selected and to whatever is drawn next.
export function applyStyle(patch: Partial<ShapeStyle>): void {
  const { selectedIds, style } = useSessionStore.getState()
  setSession({ style: { ...style, ...patch } })
  const targets = getShapesInOrder(getCurrentPage(), selectedIds)
  if (targets.length === 0) return
  const restyled = targets.map((shape) => applyStylePatch(shape, patch))
  const restyledPage = (page: Page): Page => ({
    ...page,
    shapes: {
      ...page.shapes,
      ...Object.fromEntries(restyled.map((s) => [s.id, s])),
    },
  })
  // Curved and elbow ends sit on different sides than straight ones, so a
  // routing change re-routes the glued connectors in the same undo step.
  commitCurrentPage((page) =>
    'routing' in patch
      ? rerouteConnectors(
          restyledPage(page),
          restyled.map((s) => s.id),
        )
      : restyledPage(page),
  )
}
