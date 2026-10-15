import type { ShapeStyle } from '../engine/model/shapeFactory'
import { getTableBox } from '../engine/model/tableBox'
import type {
  Page,
  Shape,
  TableShape,
  TableStateShape,
  TextShape,
} from '../engine/model/types'
import {
  parseDelete,
  parseInsertMutation,
  parseUpdate,
  type SqlMutation,
} from './engine/parseMutation'
import { runMutation } from './engine/runMutation'
import { cardHeight } from './planQueries'

const CARD_GAP = 48

export type MutationPlan = {
  shapes: Shape[]
  dropped: string[]
  errors: string[]
}

function parseMutationStatement(sql: string): SqlMutation {
  const s = sql.trim()
  if (/^update\b/i.test(s)) return parseUpdate(s)
  if (/^delete\b/i.test(s)) return parseDelete(s)
  if (/^insert\b/i.test(s)) return parseInsertMutation(s)
  throw new Error(`Unsupported mutation: "${sql}"`)
}

function formatMutationText(sql: string): string {
  return sql.trim().replace(/\s+(SET|WHERE|VALUES)\b/gi, '\n$1')
}

function mutationCodeCard(
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

function keepPlace(shape: Shape, old: Shape | undefined): Shape {
  if (!old) return shape
  const kept = { ...shape, id: old.id, revealStep: old.revealStep } as Shape
  if ('x' in kept && 'x' in old && 'y' in old) {
    Object.assign(kept, { x: old.x, y: old.y })
  }
  return kept
}

function buildOtherTableStates(
  currentTableId: string,
  tables: Map<string, TableShape>,
  tableRowsMap: Map<string, (string | null)[][]>,
) {
  const otherStates: {
    tableId: string
    rows: { dim: boolean; group: number | null; pos: number }[]
  }[] = []
  for (const otherTable of tables.values()) {
    if (otherTable.id === currentTableId) continue
    const rows = tableRowsMap.get(otherTable.id) ?? otherTable.rows ?? []
    otherStates.push({
      tableId: otherTable.id,
      rows: rows.map((_, pos) => ({ dim: false, group: null, pos })),
    })
  }
  return otherStates.length > 0 ? otherStates : undefined
}

type SingleMutationContext = {
  key: string
  sql: string
  tables: Map<string, TableShape>
  tableRowsMap: Map<string, (string | null)[][]>
  tableMaxRows: Map<string, number>
  currentCardY: number
  style: ShapeStyle
}

function planSingleMutation(ctx: SingleMutationContext): {
  shapes: Shape[]
  nextCardY: number
} {
  const { key, sql, tables, tableRowsMap, tableMaxRows, currentCardY, style } =
    ctx
  const parsed = parseMutationStatement(sql)
  const table = tables.get(parsed.table.toLowerCase())
  if (!table) throw new Error(`table "${parsed.table}" is not on this page`)
  const currentRows = tableRowsMap.get(table.id) ?? table.rows ?? []
  const run = runMutation(parsed, table, currentRows, tables)
  tableRowsMap.set(table.id, run.nextRows)

  const maxSoFar = Math.max(
    tableMaxRows.get(table.id) ?? table.rows?.length ?? 0,
    run.nextRows.length,
  )
  tableMaxRows.set(table.id, maxSoFar)
  table.maxRows = maxSoFar

  const formatted = formatMutationText(sql)
  const card = mutationCodeCard(key, formatted, 120, currentCardY, style)
  const otherStates = buildOtherTableStates(table.id, tables, tableRowsMap)
  const stages: TableStateShape[] = run.stages.map((stage, sIdx) => ({
    id: crypto.randomUUID(),
    type: 'tableState',
    tableId: table.id,
    label: stage.label,
    rows: stage.rows,
    tableStates: otherStates,
    color: 'black',
    opacity: 1,
    fromQuery: `${key}:s${sIdx}`,
  }))
  return {
    shapes: [card, ...stages],
    nextCardY: currentCardY + cardHeight(formatted) + 16,
  }
}

export function planMutations(
  page: Page,
  mutations: string[],
  tables: Map<string, TableShape>,
  style: ShapeStyle,
  startCardY?: number,
): MutationPlan {
  const old = new Map<string, Shape>()
  for (const id of page.order) {
    const key = page.shapes[id].fromQuery
    if (key?.startsWith('m')) old.set(key, page.shapes[id])
  }
  const tableBottoms = [...tables.values()].map(
    (t) => getTableBox(t).y + getTableBox(t).h,
  )
  const maxTableBottom =
    tableBottoms.length > 0 ? Math.max(...tableBottoms) : 300
  let currentCardY = startCardY ?? maxTableBottom + CARD_GAP

  const plan: MutationPlan = { shapes: [], dropped: [], errors: [] }
  const tableRowsMap = new Map<string, (string | null)[][]>()
  const tableMaxRows = new Map<string, number>()
  for (const table of tables.values()) {
    tableMaxRows.set(table.id, table.rows?.length ?? 0)
  }

  mutations.forEach((sql, index) => {
    try {
      const res = planSingleMutation({
        key: `m${index + 1}`,
        sql,
        tables,
        tableRowsMap,
        tableMaxRows,
        currentCardY,
        style,
      })
      currentCardY = res.nextCardY
      for (const shape of res.shapes) {
        plan.shapes.push(keepPlace(shape, old.get(shape.fromQuery!)))
        old.delete(shape.fromQuery!)
      }
    } catch (error) {
      plan.errors.push(`Mutation ${index + 1}: ${(error as Error).message}`)
    }
  })
  plan.dropped = [...old.values()].map((shape) => shape.id)
  return plan
}
