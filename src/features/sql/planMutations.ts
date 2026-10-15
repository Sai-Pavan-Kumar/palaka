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
  sql: string,
  table: TableShape,
  offsetIndex: number,
  style: ShapeStyle,
): TextShape {
  const box = getTableBox(table)
  return {
    id: crypto.randomUUID(),
    type: 'text',
    x: box.x,
    y: box.y + box.h + CARD_GAP + offsetIndex * 80,
    text: formatMutationText(sql),
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

export function planMutations(
  page: Page,
  mutations: string[],
  tables: Map<string, TableShape>,
  style: ShapeStyle,
): MutationPlan {
  const old = new Map<string, Shape>()
  for (const id of page.order) {
    const key = page.shapes[id].fromQuery
    if (key?.startsWith('m')) old.set(key, page.shapes[id])
  }
  const plan: MutationPlan = { shapes: [], dropped: [], errors: [] }
  const tableRowsMap = new Map<string, (string | null)[][]>()
  const tableOffsetMap = new Map<string, number>()

  mutations.forEach((sql, index) => {
    const key = `m${index + 1}`
    try {
      const parsed = parseMutationStatement(sql)
      const table = tables.get(parsed.table.toLowerCase())
      if (!table) throw new Error(`table "${parsed.table}" is not on this page`)
      const currentRows = tableRowsMap.get(table.id) ?? table.rows ?? []
      const run = runMutation(parsed, table, currentRows, tables)
      tableRowsMap.set(table.id, run.nextRows)

      const offset = tableOffsetMap.get(table.id) ?? 0
      tableOffsetMap.set(table.id, offset + 1)
      const card = mutationCodeCard(key, sql, table, offset, style)
      const stages: TableStateShape[] = run.stages.map((stage, sIdx) => ({
        id: crypto.randomUUID(),
        type: 'tableState',
        tableId: table.id,
        label: stage.label,
        rows: stage.rows,
        color: 'black',
        opacity: 1,
        fromQuery: `${key}:s${sIdx}`,
      }))

      for (const shape of [card, ...stages]) {
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
