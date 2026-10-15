import type { Page, TableStateShape } from './types'

export type RowState = TableStateShape['rows'][number]

export type ActiveHighlights = {
  // tableId → lower-case column names that are lit.
  columns: Map<string, Set<string>>
  // Connectors joining two lit columns glow with them.
  lines: Set<string>
  // tableId → row states of the latest query clause shown on that table.
  rowStates: Map<string, RowState[]>
}

export const NO_HIGHLIGHTS: ActiveHighlights = {
  columns: new Map(),
  lines: new Set(),
  rowStates: new Map(),
}

const isShown = (step: number | undefined, shownUpTo: number) =>
  step === undefined || step <= shownUpTo

// Each clause snapshot replaces the one before it on the same table.
function latestRowStates(page: Page, shownUpTo: number) {
  const latest = new Map<string, TableStateShape>()
  for (const id of page.order) {
    const shape = page.shapes[id]
    if (shape.type !== 'tableState' || !isShown(shape.revealStep, shownUpTo)) {
      continue
    }
    const current = latest.get(shape.tableId)
    if ((current?.revealStep ?? -1) <= (shape.revealStep ?? 0)) {
      latest.set(shape.tableId, shape)
    }
  }
  return new Map([...latest].map(([tableId, shape]) => [tableId, shape.rows]))
}

// Highlights only exist while presenting (shownUpTo !== null) and once their
// own step is reached; editing never shows them, so the board stays readable.
export function getActiveHighlights(
  page: Page,
  shownUpTo: number | null,
): ActiveHighlights {
  if (shownUpTo === null) return NO_HIGHLIGHTS
  const rowStates = latestRowStates(page, shownUpTo)
  const columns = new Map<string, Set<string>>()
  for (const id of page.order) {
    const shape = page.shapes[id]
    if (shape.type !== 'highlight') continue
    if (!isShown(shape.revealStep, shownUpTo)) continue
    for (const { tableId, column } of shape.targets) {
      const set = columns.get(tableId) ?? new Set<string>()
      set.add(column.toLowerCase())
      columns.set(tableId, set)
    }
  }
  if (columns.size === 0) return { ...NO_HIGHLIGHTS, rowStates }
  const isLit = (tableId?: string, column?: string) =>
    !!tableId && !!column && !!columns.get(tableId)?.has(column.toLowerCase())
  const lines = new Set<string>()
  for (const id of page.order) {
    const shape = page.shapes[id]
    if (shape.type !== 'line') continue
    const { startBinding: a, endBinding: b } = shape
    if (isLit(a?.shapeId, a?.column) && isLit(b?.shapeId, b?.column)) {
      lines.add(id)
    }
  }
  return { columns, lines, rowStates }
}
