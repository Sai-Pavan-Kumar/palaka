import type { ShapeStyle } from '../engine/model/shapeFactory'
import { getTableBox } from '../engine/model/tableBox'
import type {
  Page,
  Shape,
  TableShape,
  TableStateShape,
  TextShape,
} from '../engine/model/types'
import { parseSelect, type SelectQuery } from './engine/parseSelect'
import { runSelect, type QueryRun, type SourceTable } from './engine/runSelect'

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
  nextCardY: number
}

export function formatQueryText(sql: string): string {
  return sql
    .trim()
    .replace(
      /\s+(FROM|(?:(?:INNER|LEFT|RIGHT|FULL)(?:\s+OUTER)?\s+)?JOIN|ON|WHERE|GROUP BY|ORDER BY|LIMIT)\b/gi,
      '\n$1',
    )
}

export function cardHeight(text: string): number {
  return text.split('\n').length * 24 + 14
}

function codeCard(
  key: string,
  formattedText: string,
  cardX: number,
  cardY: number,
  style: ShapeStyle,
): TextShape {
  return {
    id: crypto.randomUUID(),
    type: 'text',
    x: cardX,
    y: cardY,
    text: formattedText,
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
  leftTable: TableShape,
  rightTable: TableShape | undefined,
  result: { columns: string[]; rows: (string | null)[][] },
): TableShape {
  const leftBox = getTableBox(leftTable)
  const rightBox = rightTable ? getTableBox(rightTable) : undefined
  const rightmostX = rightBox
    ? Math.max(leftBox.x + leftBox.w, rightBox.x + rightBox.w)
    : leftBox.x + leftBox.w
  const topY = rightBox ? Math.min(leftBox.y, rightBox.y) : leftBox.y
  return {
    ...leftTable,
    id: crypto.randomUUID(),
    revealStep: undefined,
    x: rightmostX + RESULT_GAP,
    y: topY,
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

function buildStages(
  key: string,
  run: QueryRun,
  leftTable: TableShape,
  rightTable?: TableShape,
): TableStateShape[] {
  return run.stages.map((stage, index): TableStateShape => {
    let tableStates:
      | {
          tableId: string
          rows: import('../engine/model/highlights').RowState[]
        }[]
      | undefined
    if (stage.tableRows && rightTable) {
      const rightStates = stage.tableRows[rightTable.name.toLowerCase()]
      if (rightStates) {
        tableStates = [{ tableId: rightTable.id, rows: rightStates }]
      }
    }
    return {
      id: crypto.randomUUID(),
      type: 'tableState',
      tableId: leftTable.id,
      label: stage.label,
      rows: stage.rows,
      tableStates,
      color: 'black',
      opacity: 1,
      fromQuery: `${key}:s${index}`,
    }
  })
}

function buildQuery(
  key: string,
  formattedText: string,
  cardX: number,
  cardY: number,
  query: SelectQuery,
  leftTable: TableShape,
  rightTable: TableShape | undefined,
  tables: Map<string, TableShape>,
  style: ShapeStyle,
): Shape[] {
  const sourceMap = new Map<string, SourceTable>()
  for (const [name, t] of tables.entries()) {
    sourceMap.set(name.toLowerCase(), {
      name: t.name,
      columns: t.columns.map((c) => c.name),
      rows: t.rows ?? [],
    })
  }
  const primarySource = sourceMap.get(leftTable.name.toLowerCase())!
  const run = runSelect(query, primarySource, sourceMap)
  return [
    codeCard(key, formattedText, cardX, cardY, style),
    ...buildStages(key, run, leftTable, rightTable),
    resultTable(key, leftTable, rightTable, run.result),
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

export function initialCardY(tables: Map<string, TableShape>): number {
  const tableBottoms = [...tables.values()].map(
    (t) => getTableBox(t).y + getTableBox(t).h,
  )
  const maxTableBottom =
    tableBottoms.length > 0 ? Math.max(...tableBottoms) : 300
  return maxTableBottom + CARD_GAP
}

function planSingleQuery(
  key: string,
  sql: string,
  tables: Map<string, TableShape>,
  currentCardY: number,
  style: ShapeStyle,
): { shapes: Shape[]; nextCardY: number } {
  const query = parseSelect(sql)
  const from = query.table
  const leftTable = tables.get(from)
  if (!leftTable) throw new Error(`table "${from}" is not on this page`)
  let rightTable: TableShape | undefined
  if (query.joins.length > 0) {
    const joinName = query.joins[0].table.name
    rightTable = tables.get(joinName)
    if (!rightTable) {
      throw new Error(`table "${joinName}" is not on this page`)
    }
  }
  const formatted = formatQueryText(sql)
  const built = buildQuery(
    key,
    formatted,
    120,
    currentCardY,
    query,
    leftTable,
    rightTable,
    tables,
    style,
  )
  return {
    shapes: built,
    nextCardY: currentCardY + cardHeight(formatted) + 16,
  }
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
    if (key?.startsWith('q')) old.set(key, page.shapes[id])
  }
  let currentCardY = initialCardY(tables)
  const plan: QueryPlan = {
    shapes: [],
    dropped: [],
    errors: [],
    nextCardY: currentCardY,
  }
  queries.forEach((sql, index) => {
    try {
      const res = planSingleQuery(
        `q${index + 1}`,
        sql,
        tables,
        currentCardY,
        style,
      )
      currentCardY = res.nextCardY
      for (const shape of res.shapes) {
        plan.shapes.push(keepPlace(shape, old.get(shape.fromQuery!)))
        old.delete(shape.fromQuery!)
      }
    } catch (error) {
      plan.errors.push(`Query ${index + 1}: ${(error as Error).message}`)
    }
  })
  plan.nextCardY = currentCardY
  plan.dropped = [...old.values()].map((shape) => shape.id)
  return plan
}
