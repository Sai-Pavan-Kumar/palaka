import { compareValues, evaluate, type Row } from './expr'
import type { SelectItem, SelectQuery } from './parseSelect'

import { runJoin } from './runJoin'

type Value = string | null

export type SourceTable = { name: string; columns: string[]; rows: Value[][] }

export type RowState = {
  dim: boolean
  group: number | null
  pos: number
  values?: (string | null)[]
  isNew?: boolean
  error?: string
}

export type QueryStage = {
  label: string
  rows: RowState[]
  tableRows?: Record<string, RowState[]>
}

export type QueryRun = {
  stages: QueryStage[]
  result: { columns: string[]; rows: Value[][] }
}

function toRow(table: SourceTable, values: Value[]): Row {
  return Object.fromEntries(
    table.columns.map((name, i) => [name.toLowerCase(), values[i]]),
  )
}

// Rows in display order: the kept ones (in `order`), then the dropped ones.
function positions(order: number[], total: number): number[] {
  const pos = new Array<number>(total)
  const rest = [...Array(total).keys()].filter((i) => !order.includes(i))
  ;[...order, ...rest].forEach((rowIndex, at) => (pos[rowIndex] = at))
  return pos
}

function aggregate(
  item: Extract<SelectItem, { kind: 'aggregate' }>,
  rows: Row[],
) {
  if (item.fn === 'count') {
    const counted = item.column
      ? rows.filter((r) => r[item.column!] !== null)
      : rows
    return String(counted.length)
  }
  const values = rows
    .map((r) => r[item.column ?? ''])
    .filter((v): v is string => v !== null && v !== undefined)
  if (values.length === 0) return null
  if (item.fn === 'min' || item.fn === 'max') {
    const sorted = [...values].sort(compareValues)
    return item.fn === 'min' ? sorted[0] : sorted[sorted.length - 1]
  }
  const sum = values.reduce((total, v) => total + Number(v), 0)
  const result = item.fn === 'sum' ? sum : sum / values.length
  return String(Math.round(result * 100) / 100)
}

function project(
  query: SelectQuery,
  table: SourceTable,
  group: Row[],
): Value[] {
  return query.items.flatMap((item) => {
    if (item.kind === 'all')
      return table.columns.map((c) => group[0][c.toLowerCase()])
    if (item.kind === 'column') return [group[0][item.column] ?? null]
    return [aggregate(item, group)]
  })
}

function resultColumns(query: SelectQuery, table: SourceTable): string[] {
  return query.items.flatMap((item) =>
    item.kind === 'all' ? table.columns : [item.label],
  )
}

function sortIndices(indices: number[], rows: Row[], query: SelectQuery) {
  return [...indices].sort((a, b) => {
    for (const { column, desc } of query.orderBy) {
      const x = rows[a][column] ?? ''
      const y = rows[b][column] ?? ''
      const diff = compareValues(x, y)
      if (diff !== 0) return desc ? -diff : diff
    }
    return a - b
  })
}

function checkColumns(query: SelectQuery, table: SourceTable): void {
  // ORDER BY may also name a result alias ("ORDER BY spent").
  const known = new Set(
    [...table.columns, ...resultColumns(query, table)].map((c) =>
      c.toLowerCase(),
    ),
  )
  for (const column of [
    ...query.groupBy,
    ...query.orderBy.map((o) => o.column),
  ]) {
    if (!known.has(column)) throw new Error(`No column "${column}"`)
  }
}

// One snapshot: rows outside `visible` fade, everyone sits at `order`.
function snapshot(
  label: string,
  total: number,
  visible: number[],
  order: number[],
): QueryStage {
  const pos = positions(order, total)
  return {
    label,
    rows: [...Array(total).keys()].map((i) => ({
      dim: !visible.includes(i),
      group: null,
      pos: pos[i],
    })),
  }
}

// Runs one SELECT on the sample rows and records what each clause did, so
// every clause can be its own Space step on the board.
export function runSelect(
  query: SelectQuery,
  table: SourceTable,
  tables?: Map<string, SourceTable>,
): QueryRun {
  if (query.joins && query.joins.length > 0) {
    if (!tables) {
      throw new Error('JOIN requires tables map to resolve joined tables')
    }
    return runJoin(query, table, tables)
  }
  checkColumns(query, table)
  const rows = table.rows.map((values) => toRow(table, values))
  const total = rows.length
  const stages: QueryStage[] = []
  let kept = [...rows.keys()]
  if (query.where) {
    kept = kept.filter((i) => evaluate(query.where!, rows[i]))
    const label = `WHERE ${query.text.where}`
    stages.push(snapshot(label, total, kept, [...rows.keys()]))
  }
  const grouped =
    query.groupBy.length > 0 || query.items.some((i) => i.kind === 'aggregate')
  if (grouped) return runGrouped(query, table, rows, kept, stages)
  let order = kept
  if (query.orderBy.length > 0) {
    order = sortIndices(kept, rows, query)
    stages.push(snapshot(`ORDER BY ${query.text.orderBy}`, total, kept, order))
  }
  if (query.limit !== null) {
    const shown = order.slice(0, query.limit)
    stages.push(snapshot(`LIMIT ${query.text.limit}`, total, shown, order))
    order = shown
  }
  return {
    stages,
    result: {
      columns: resultColumns(query, table),
      rows: order.map((i) => project(query, table, [rows[i]])),
    },
  }
}

function runGrouped(
  query: SelectQuery,
  table: SourceTable,
  rows: Row[],
  kept: number[],
  stages: QueryStage[],
): QueryRun {
  const keyOf = (i: number) =>
    query.groupBy.map((c) => rows[i][c] ?? 'NULL').join('\u0000')
  const keys = [...new Set(kept.map(keyOf))]
  if (query.groupBy.length > 0) {
    const order = [...kept].sort(
      (a, b) => keys.indexOf(keyOf(a)) - keys.indexOf(keyOf(b)) || a - b,
    )
    const pos = positions(order, rows.length)
    stages.push({
      label: `GROUP BY ${query.text.groupBy}`,
      rows: rows.map((_, i) => ({
        dim: !kept.includes(i),
        group: kept.includes(i) ? keys.indexOf(keyOf(i)) : null,
        pos: pos[i],
      })),
    })
  }
  let groups = keys.map((key) =>
    kept.filter((i) => keyOf(i) === key).map((i) => rows[i]),
  )
  if (query.groupBy.length === 0) groups = [kept.map((i) => rows[i])]
  let resultRows = groups.map((group) =>
    project(query, table, group.length ? group : [{}]),
  )
  const columns = resultColumns(query, table)
  if (query.orderBy.length > 0) {
    const asRows = resultRows.map((r) =>
      Object.fromEntries(columns.map((c, i) => [c.toLowerCase(), r[i]])),
    )
    resultRows = sortIndices([...resultRows.keys()], asRows, query).map(
      (i) => resultRows[i],
    )
  }
  if (query.limit !== null) resultRows = resultRows.slice(0, query.limit)
  return { stages, result: { columns, rows: resultRows } }
}
