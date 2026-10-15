import type { ShapeStyle } from '../engine/model/shapeFactory'
import { getTableBox } from '../engine/model/tableBox'
import type {
  Page,
  Shape,
  TableShape,
  TableStateShape,
  TextShape,
} from '../engine/model/types'
import { parseSelect } from './engine/parseSelect'
import { runSelect } from './engine/runSelect'

// Card under its table, result table to the right: the eye reads query →
// source rows changing → answer, left to right.
const CARD_GAP = 48
const RESULT_GAP = 140

export type QueryPlan = {
  // Shapes in reveal order: card, one step per clause, result table.
  shapes: Shape[]
  // Old query shapes no SELECT produced any more.
  dropped: string[]
  errors: string[]
}

function codeCard(
  key: string,
  sql: string,
  table: TableShape,
  style: ShapeStyle,
): TextShape {
  const box = getTableBox(table)
  return {
    id: crypto.randomUUID(),
    type: 'text',
    x: box.x,
    y: box.y + box.h + CARD_GAP,
    text: sql
      .trim()
      .replace(/\s+(FROM|WHERE|GROUP BY|ORDER BY|LIMIT)\b/gi, '\n$1'),
    font: 'code',
    size: 's',
    scale: 1,
    color: style.color,
    opacity: style.opacity,
    fromQuery: `${key}:card`,
  }
}

function resultTable(
  key: string,
  table: TableShape,
  result: { columns: string[]; rows: (string | null)[][] },
): TableShape {
  const box = getTableBox(table)
  return {
    ...table,
    id: crypto.randomUUID(),
    revealStep: undefined,
    x: box.x + box.w + RESULT_GAP,
    name: 'result',
    columns: result.columns.map((name) => ({
      name,
      type: '',
      pk: false,
      notNull: false,
      unique: false,
    })),
    rows: result.rows,
    view: 'data',
    fromQuery: `${key}:result`,
  }
}

function buildQuery(
  key: string,
  sql: string,
  table: TableShape,
  style: ShapeStyle,
): Shape[] {
  const run = runSelect(parseSelect(sql), {
    name: table.name,
    columns: table.columns.map((c) => c.name),
    rows: table.rows ?? [],
  })
  const stages = run.stages.map((stage, index): TableStateShape => ({
    id: crypto.randomUUID(),
    type: 'tableState',
    tableId: table.id,
    label: stage.label,
    rows: stage.rows,
    color: 'black',
    opacity: 1,
    fromQuery: `${key}:s${index}`,
  }))
  return [
    codeCard(key, sql, table, style),
    ...stages,
    resultTable(key, table, run.result),
  ]
}

// A rebuilt shape keeps the old one's id, place and reveal step, so a
// re-insert while preparing never shuffles the story.
function keepPlace(shape: Shape, old: Shape | undefined): Shape {
  if (!old) return shape
  const kept = { ...shape, id: old.id, revealStep: old.revealStep } as Shape
  if ('x' in kept && 'x' in old && 'y' in old) {
    Object.assign(kept, { x: old.x, y: old.y })
  }
  return kept
}

export function planQueries(
  page: Page,
  queries: string[],
  tables: Map<string, TableShape>,
  style: ShapeStyle,
): QueryPlan {
  const old = new Map<string, Shape>()
  for (const id of page.order) {
    const key = page.shapes[id].fromQuery
    if (key) old.set(key, page.shapes[id])
  }
  const plan: QueryPlan = { shapes: [], dropped: [], errors: [] }
  queries.forEach((sql, index) => {
    const key = `q${index + 1}`
    try {
      const from = parseSelect(sql).table
      const table = tables.get(from)
      if (!table) throw new Error(`table "${from}" is not on this page`)
      for (const shape of buildQuery(key, sql, table, style)) {
        plan.shapes.push(keepPlace(shape, old.get(shape.fromQuery!)))
        old.delete(shape.fromQuery!)
      }
    } catch (error) {
      plan.errors.push(`Query ${index + 1}: ${(error as Error).message}`)
    }
  })
  plan.dropped = [...old.values()].map((shape) => shape.id)
  return plan
}
