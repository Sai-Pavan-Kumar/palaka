import { commitCurrentPage } from '../engine/boardActions'
import { rerouteConnectors } from '../engine/model/connectors'
import { addShape, removeShapes } from '../engine/model/documentOps'
import { withRevealStep } from '../engine/model/revealSteps'
import type { ShapeStyle } from '../engine/model/shapeFactory'
import { getShapeBounds } from '../engine/model/geometry'
import { getTableBox } from '../engine/model/tableBox'
import type { Bounds, LineShape, Page, TableShape } from '../engine/model/types'
import { useSessionStore } from '../engine/sessionStore'
import type { SqlParseResult, SqlTable } from './parseSql'
import { planHighlights } from './planHighlights'
import { planMutations } from './planMutations'
import { planQueries } from './planQueries'
import { getDependencyLevels } from './tableLayoutPlan'

// First table's corner, clear of the brand mark; gaps between tables.
const ORIGIN = { x: 120, y: 150 }
const COLUMN_GAP = 140
const ROW_GAP = 60

const keyOf = (name: string) => name.toLowerCase()

function existingTables(page: Page): Map<string, TableShape> {
  const tables = new Map<string, TableShape>()
  for (const id of page.order) {
    const shape = page.shapes[id]
    // A query's result table is rebuilt by the query, never by name.
    if (shape.type === 'table' && !shape.fromQuery) {
      tables.set(keyOf(shape.name), shape)
    }
  }
  return tables
}

function newTable(table: SqlTable, style: ShapeStyle): TableShape {
  return {
    id: crypto.randomUUID(),
    type: 'table',
    x: 0,
    y: 0,
    scale: 1,
    name: table.name,
    columns: table.columns,
    rows: table.rows,
    color: style.color,
    opacity: style.opacity,
    size: style.size,
    fill: 'tint',
    dash: 'clean',
  }
}

function overlaps(a: Bounds, b: Bounds): boolean {
  return (
    a.minX < b.maxX + ROW_GAP &&
    a.maxX + ROW_GAP > b.minX &&
    a.minY < b.maxY + ROW_GAP &&
    a.maxY + ROW_GAP > b.minY
  )
}

// Slides down its column until it touches nothing already on the page.
function dropIntoFreeSpot(table: TableShape, x: number, taken: Bounds[]) {
  Object.assign(table, { x, y: ORIGIN.y })
  for (let guard = 0; guard < taken.length + 1; guard++) {
    const box = getShapeBounds(table)
    const hit = taken.find((other) => overlaps(box, other))
    if (!hit) break
    table.y = hit.maxY + ROW_GAP
  }
  taken.push(getShapeBounds(table))
}

// Right of its rightmost parent, so foreign-key arrows run left to right;
// a table without parents starts at the left edge.
function columnX(table: TableShape, placed: Map<string, TableShape>): number {
  const parentRights = table.columns
    .map((column) => column.fk && placed.get(keyOf(column.fk.table)))
    .filter((parent): parent is TableShape => !!parent && parent !== table)
    .map((parent) => parent.x + getTableBox(parent).w + COLUMN_GAP)
  return Math.max(ORIGIN.x, ...parentRights)
}

// Only brand-new tables are placed (parents before children), each in the
// first free spot of its column; tables already on the page stay where the
// teacher put them.
function placeNewTables(
  fresh: TableShape[],
  tables: SqlTable[],
  page: Page,
  existing: Map<string, TableShape>,
): void {
  const levels = getDependencyLevels(tables)
  const ordered = [...fresh].sort(
    (a, b) =>
      (levels.get(keyOf(a.name)) ?? 0) - (levels.get(keyOf(b.name)) ?? 0),
  )
  const placed = new Map(existing)
  const taken = page.order.map((id) => getShapeBounds(page.shapes[id]))
  for (const table of ordered) {
    dropIntoFreeSpot(table, columnX(table, placed), taken)
    placed.set(keyOf(table.name), table)
  }
}

// Auto foreign-key arrows are the ones glued to a table column.
function fkKey(line: LineShape): string | null {
  const binding = line.startBinding
  return binding?.column ? `${binding.shapeId}:${keyOf(binding.column)}` : null
}

function oldFkArrows(page: Page, tableIds: Set<string>) {
  const arrows = new Map<string, LineShape>()
  for (const id of page.order) {
    const shape = page.shapes[id]
    if (shape.type !== 'line') continue
    const key = fkKey(shape)
    if (key && tableIds.has(shape.startBinding!.shapeId)) {
      arrows.set(key, shape)
    }
  }
  return arrows
}

type ArrowPlan = { kept: LineShape[]; created: LineShape[]; dropped: string[] }

// One arrow per foreign key, child column → parent column. An arrow that
// already existed keeps its id, step, label and flow, so a re-insert while
// presenting changes nothing the audience has seen.
function planArrows(
  page: Page,
  tables: TableShape[],
  style: ShapeStyle,
): ArrowPlan {
  const byName = new Map(tables.map((t) => [keyOf(t.name), t]))
  const old = oldFkArrows(page, new Set(tables.map((t) => t.id)))
  const plan: ArrowPlan = { kept: [], created: [], dropped: [] }
  for (const table of tables) {
    for (const column of table.columns) {
      const parent = column.fk && byName.get(keyOf(column.fk.table))
      if (!column.fk || !parent) continue
      const key = `${table.id}:${keyOf(column.name)}`
      const previous = old.get(key)
      old.delete(key)
      const ends = {
        startBinding: { shapeId: table.id, column: column.name },
        endBinding: { shapeId: parent.id, column: column.fk.column },
      }
      if (previous) plan.kept.push({ ...previous, ...ends })
      else plan.created.push(newArrow(ends, style))
    }
  }
  plan.dropped = [...old.values()].map((line) => line.id)
  return plan
}

function newArrow(
  ends: Pick<LineShape, 'startBinding' | 'endBinding'>,
  style: ShapeStyle,
): LineShape {
  return {
    id: crypto.randomUUID(),
    type: 'line',
    x1: 0,
    y1: 0,
    x2: 0,
    y2: 0,
    arrowhead: true,
    color: style.color,
    opacity: style.opacity,
    size: 's',
    dash: 'clean',
    ...ends,
  }
}

export type InsertSummary = {
  added: number
  updated: number
  arrows: number
  highlights: number
  queries: number
  mutations: number
  errors: string[]
}

// New or updated table shapes for the parsed tables (rows replace the old
// sample rows; position, step and style are kept).
function mergeTables(page: Page, parsed: SqlTable[], style: ShapeStyle) {
  const existing = existingTables(page)
  const fresh: TableShape[] = []
  const all = parsed.map((table) => {
    const old = existing.get(keyOf(table.name))
    if (old) {
      return {
        ...old,
        name: table.name,
        columns: table.columns,
        rows: table.rows,
      }
    }
    const created = newTable(table, style)
    fresh.push(created)
    return created
  })
  placeNewTables(fresh, parsed, page, existing)
  // Same id twice (old copy + updated copy) would plan its arrows twice.
  const byName = new Map(
    [...existing.values(), ...all].map((t) => [keyOf(t.name), t]),
  )
  return { fresh, updated: all.filter((t) => !fresh.includes(t)), byName }
}

// One undo step: tables first (each its own reveal step), then their
// foreign-key arrows, then highlight steps, all routed to the right rows.
export function insertSqlTables(parsed: SqlParseResult): InsertSummary {
  const { style, presenting } = useSessionStore.getState()
  let summary: InsertSummary | null = null
  commitCurrentPage((page) => {
    const { fresh, updated, byName } = mergeTables(page, parsed.tables, style)
    const arrows = planArrows(page, [...byName.values()], style)
    const lights = planHighlights(page, parsed.highlights, byName)
    const queries = planQueries(page, parsed.queries, byName, style)
    const mutations = planMutations(page, parsed.mutations, byName, style)
    const dropped = [
      ...arrows.dropped,
      ...lights.dropped,
      ...queries.dropped,
      ...mutations.dropped,
    ]
    let next = removeShapes(page, dropped)
    const updates = [...updated, ...arrows.kept, ...lights.kept]
    next = { ...next, shapes: { ...next.shapes, ...byId(updates) } }
    const added = [...fresh, ...arrows.created, ...lights.created]
    for (const shape of [...added, ...queries.shapes, ...mutations.shapes]) {
      next = next.shapes[shape.id]
        ? { ...next, shapes: { ...next.shapes, [shape.id]: shape } }
        : addShape(next, withRevealStep(next, shape, presenting))
    }
    const lineIds = [...arrows.kept, ...arrows.created].map((l) => l.id)
    summary = {
      added: fresh.length,
      updated: updated.length,
      arrows: lineIds.length,
      highlights: lights.kept.length + lights.created.length,
      queries: parsed.queries.length - queries.errors.length,
      mutations: parsed.mutations.length - mutations.errors.length,
      errors: [...lights.errors, ...queries.errors, ...mutations.errors],
    }
    // Updated tables may have changed size: hand-drawn arrows on them follow.
    return rerouteConnectors(next, [...lineIds, ...updated.map((t) => t.id)])
  })
  return summary!
}

function byId<S extends { id: string }>(shapes: S[]): Record<string, S> {
  return Object.fromEntries(shapes.map((shape) => [shape.id, shape]))
}
