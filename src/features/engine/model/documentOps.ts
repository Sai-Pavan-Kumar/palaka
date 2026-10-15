import { rerouteConnectors, unbindFrom } from './connectors'
import { DEFAULT_PAPER } from './paper'
import { pruneOrphanedShapes } from './pruneShapes'
import type { Aspect, BoardDocument, ImageAsset, Page, Shape } from './types'

// Every function returns new objects and never mutates the old ones. Undo
// relies on that: old documents are kept exactly as they were.

export function createPage(name: string): Page {
  return { id: crypto.randomUUID(), name, shapes: {}, order: [] }
}

export function createEmptyDocument(aspect: Aspect = '16:9'): BoardDocument {
  return {
    version: 2,
    aspect,
    paper: DEFAULT_PAPER,
    pages: [createPage('Page 1')],
    assets: {},
  }
}

export function findPage(doc: BoardDocument, pageId: string): Page | null {
  return doc.pages.find((page) => page.id === pageId) ?? null
}

export function updatePage(
  doc: BoardDocument,
  pageId: string,
  recipe: (page: Page) => Page,
): BoardDocument {
  let changed = false
  const pages = doc.pages.map((page) => {
    if (page.id !== pageId) return page
    const next = recipe(page)
    changed ||= next !== page
    return next
  })
  return changed ? { ...doc, pages } : doc
}

export function addShape(page: Page, shape: Shape): Page {
  return {
    ...page,
    shapes: { ...page.shapes, [shape.id]: shape },
    order: [...page.order, shape.id],
  }
}

// Connectors are re-routed here, not by each tool, so no edit path (drag,
// resize, label typing, undo-free live updates) can leave an arrow behind.
export function replaceShapes(page: Page, shapes: Shape[]): Page {
  if (shapes.length === 0) return page
  const next = { ...page.shapes }
  for (const shape of shapes) next[shape.id] = shape
  return rerouteConnectors(
    { ...page, shapes: next },
    shapes.map((shape) => shape.id),
  )
}

export function removeShapes(page: Page, ids: Iterable<string>): Page {
  const doomed = new Set(ids)
  if (!page.order.some((id) => doomed.has(id))) return page
  const next = { ...page.shapes }
  for (const id of doomed) delete next[id]
  const unbound = unbindFrom(
    {
      ...page,
      shapes: next,
      order: page.order.filter((id) => !doomed.has(id)),
    },
    doomed,
  )
  return pruneOrphanedShapes(unbound, doomed)
}

// Keeps the moved shapes in their current relative order.
export function moveToEdge(
  page: Page,
  ids: string[],
  edge: 'front' | 'back',
): Page {
  const moving = new Set(ids)
  const picked = page.order.filter((id) => moving.has(id))
  if (picked.length === 0) return page
  const rest = page.order.filter((id) => !moving.has(id))
  return {
    ...page,
    order: edge === 'front' ? [...rest, ...picked] : [...picked, ...rest],
  }
}

export function getShapesInOrder(page: Page, ids: string[]): Shape[] {
  return ids.map((id) => page.shapes[id]).filter((shape) => shape !== undefined)
}

export function getOrderedShapes(page: Page): Shape[] {
  return page.order.map((id) => page.shapes[id])
}

export function insertPageAfter(
  doc: BoardDocument,
  afterPageId: string,
  page: Page,
): BoardDocument {
  const index = doc.pages.findIndex((p) => p.id === afterPageId)
  const pages = [...doc.pages]
  pages.splice(index + 1, 0, page)
  return { ...doc, pages }
}

export function removePage(doc: BoardDocument, pageId: string): BoardDocument {
  if (doc.pages.length <= 1) return doc
  return { ...doc, pages: doc.pages.filter((page) => page.id !== pageId) }
}

export function addAsset(doc: BoardDocument, asset: ImageAsset): BoardDocument {
  return { ...doc, assets: { ...doc.assets, [asset.id]: asset } }
}
