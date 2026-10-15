import { isEffect } from './effects'
import { normalizeSteps } from './revealSteps'
import type { Page, Shape } from './types'

function isShapeOrphaned(
  shape: Shape,
  shapes: Record<string, Shape>,
  removedIds: Set<string>,
  deletedQueryKeys: Set<string>,
): boolean {
  if (shape.fromQuery) {
    const qKey = shape.fromQuery.split(':')[0]
    if (deletedQueryKeys.has(qKey)) return true
  }
  if (shape.type === 'tableState') {
    const parent = shapes[shape.tableId]
    return !parent || parent.type !== 'table' || removedIds.has(shape.tableId)
  }
  if (shape.type === 'highlight') {
    return shape.targets.some(
      (t) =>
        !shapes[t.tableId] ||
        shapes[t.tableId].type !== 'table' ||
        removedIds.has(t.tableId),
    )
  }
  return false
}

// Drops effect shapes (tableState, highlight) and query stages that have lost
// their parent tables or cards. If no tangible shapes remain on the page, the
// entire sequence is wiped clean.
export function pruneOrphanedShapes(page: Page, removedIds: Set<string>): Page {
  const shapes = { ...page.shapes }
  let order = page.order.filter((id) => !removedIds.has(id))
  const queryKeys = new Set(
    [...removedIds]
      .map((id) => page.shapes[id]?.fromQuery?.split(':')[0])
      .filter((k): k is string => Boolean(k)),
  )

  const toDrop = order.filter((id) => {
    const s = shapes[id]
    return !s || isShapeOrphaned(s, shapes, removedIds, queryKeys)
  })

  for (const id of toDrop) delete shapes[id]
  const droppedSet = new Set(toDrop)
  order = order.filter((id) => !droppedSet.has(id))

  const hasVisible = order.some((id) => shapes[id] && !isEffect(shapes[id]))
  if (!hasVisible) return { ...page, shapes: {}, order: [] }

  return normalizeSteps({ ...page, shapes, order })
}
