import type { HighlightShape, Page, TableShape } from '../engine/model/types'
import type { SqlColumnRef } from './parseHighlights'

export type HighlightPlan = {
  kept: HighlightShape[]
  created: HighlightShape[]
  dropped: string[]
  // Highlights naming a table or column that is not on the page.
  errors: string[]
}

type Target = HighlightShape['targets'][number]

const keyOf = (targets: Target[]) =>
  targets.map((t) => `${t.tableId}.${t.column.toLowerCase()}`).join('>')

function resolve(
  refs: SqlColumnRef[],
  tables: Map<string, TableShape>,
): Target[] | string {
  const targets: Target[] = []
  for (const ref of refs) {
    const table = tables.get(ref.table.toLowerCase())
    const column = table?.columns.find(
      (c) => c.name.toLowerCase() === ref.column.toLowerCase(),
    )
    if (!table || !column)
      return `Highlight: ${ref.table}.${ref.column} is not on this page.`
    targets.push({ tableId: table.id, column: column.name })
  }
  return targets
}

// The SQL panel owns the page's highlights: insert rebuilds them from the
// comments. One that was already there keeps its id and reveal step.
export function planHighlights(
  page: Page,
  wanted: SqlColumnRef[][],
  tables: Map<string, TableShape>,
): HighlightPlan {
  const old = new Map<string, HighlightShape>()
  for (const id of page.order) {
    const shape = page.shapes[id]
    if (shape.type === 'highlight') old.set(keyOf(shape.targets), shape)
  }
  const plan: HighlightPlan = { kept: [], created: [], dropped: [], errors: [] }
  for (const refs of wanted) {
    const targets = resolve(refs, tables)
    if (typeof targets === 'string') {
      plan.errors.push(targets)
      continue
    }
    const previous = old.get(keyOf(targets))
    old.delete(keyOf(targets))
    if (previous) plan.kept.push(previous)
    else plan.created.push(newHighlight(targets))
  }
  plan.dropped = [...old.values()].map((shape) => shape.id)
  return plan
}

function newHighlight(targets: Target[]): HighlightShape {
  return {
    id: crypto.randomUUID(),
    type: 'highlight',
    color: 'black',
    opacity: 1,
    targets,
  }
}
