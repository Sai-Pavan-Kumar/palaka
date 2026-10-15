import { evaluate, type Row } from './expr'
import type {
  DeleteMutation,
  InsertMutation,
  SqlMutation,
  UpdateMutation,
} from './parseMutation'
import type { QueryStage, RowState } from './runSelect'
import type { TableShape } from '../../engine/model/types'

export type MutationRun = {
  stages: QueryStage[]
  nextRows: (string | null)[][]
}

function rowToDict(columns: string[], values: (string | null)[]): Row {
  const dict: Row = {}
  columns.forEach((col, i) => {
    dict[col.toLowerCase()] = values[i] ?? null
  })
  return dict
}

function runUpdate(
  mutation: UpdateMutation,
  table: TableShape,
  rows: (string | null)[][],
): MutationRun {
  const cols = table.columns.map((c) => c.name.toLowerCase())
  const assignMap = new Map(
    mutation.assignments.map((a) => [a.column.toLowerCase(), a.value]),
  )
  const nextRows = rows.map((r) => [...r])
  const states: RowState[] = rows.map((rowVals, i) => {
    const dict = rowToDict(cols, rowVals)
    const matches = !mutation.where || evaluate(mutation.where, dict)
    if (matches) {
      cols.forEach((col, colIdx) => {
        if (assignMap.has(col)) {
          nextRows[i][colIdx] = assignMap.get(col)!
        }
      })
      return {
        dim: false,
        group: 0,
        pos: i,
        values: nextRows[i],
      }
    }
    return { dim: false, group: null, pos: i, values: rowVals }
  })
  const label = mutation.where
    ? `UPDATE ${table.name} SET ${mutation.text.set} WHERE ${mutation.text.where}`
    : `UPDATE ${table.name} SET ${mutation.text.set}`
  return {
    stages: [{ label, rows: states }],
    nextRows,
  }
}

function runDelete(
  mutation: DeleteMutation,
  table: TableShape,
  rows: (string | null)[][],
): MutationRun {
  const cols = table.columns.map((c) => c.name.toLowerCase())
  const kept: (string | null)[][] = []
  const states: RowState[] = rows.map((rowVals, i) => {
    const dict = rowToDict(cols, rowVals)
    const matches = !mutation.where || evaluate(mutation.where, dict)
    if (matches) {
      return { dim: true, group: null, pos: i }
    }
    kept.push(rowVals)
    return { dim: false, group: null, pos: i }
  })
  const label = mutation.where
    ? `DELETE FROM ${table.name} WHERE ${mutation.text.where}`
    : `DELETE FROM ${table.name}`
  return {
    stages: [{ label, rows: states }],
    nextRows: kept,
  }
}

function validateRowConstraints(
  table: TableShape,
  newRow: (string | null)[],
  existingRows: (string | null)[][],
  allTables: Map<string, TableShape>,
): string | undefined {
  for (let i = 0; i < table.columns.length; i++) {
    const col = table.columns[i]
    const val = newRow[i]
    if (col.notNull && (val === null || val === undefined)) {
      return `NOT NULL failed: ${col.name}`
    }
    if (col.pk) {
      const exists = existingRows.some((r) => r[i] === val)
      if (exists) return `Duplicate PK (${col.name} = ${val})`
    }
    if (col.fk && val !== null && val !== undefined) {
      const parent = allTables.get(col.fk.table.toLowerCase())
      if (parent) {
        const parentColIdx = parent.columns.findIndex(
          (c) => c.name.toLowerCase() === col.fk!.column.toLowerCase(),
        )
        const parentRows = parent.rows ?? []
        const hasParent = parentRows.some((pr) => pr[parentColIdx] === val)
        if (!hasParent) {
          return `FK error: ${col.name} = ${val} not in ${col.fk.table}`
        }
      }
    }
  }
  return undefined
}

function alignInsertValues(
  table: TableShape,
  mutation: InsertMutation,
): (string | null)[] {
  const tableCols = table.columns.map((c) => c.name.toLowerCase())
  const rawValues = mutation.values[0] ?? []
  if (!mutation.columns) {
    return tableCols.map((_, i) => rawValues[i] ?? null)
  }
  const specified = mutation.columns.map((c) => c.toLowerCase())
  return tableCols.map((c) => {
    const idx = specified.indexOf(c)
    return idx !== -1 ? (rawValues[idx] ?? null) : null
  })
}

function runInsert(
  mutation: InsertMutation,
  table: TableShape,
  rows: (string | null)[][],
  allTables: Map<string, TableShape>,
): MutationRun {
  const newRow = alignInsertValues(table, mutation)
  const error = validateRowConstraints(table, newRow, rows, allTables)
  const label = `INSERT INTO ${table.name} VALUES (${mutation.text.values})`

  if (error) {
    const conflictIdx = rows.findIndex((r) =>
      table.columns.some((c, ci) => c.pk && r[ci] === newRow[ci]),
    )
    const errIdx = conflictIdx !== -1 ? conflictIdx : 0
    const states: RowState[] = rows.map((_, i) => ({
      dim: false,
      group: i === conflictIdx ? 4 : null,
      pos: i,
      error: i === errIdx ? error : undefined,
    }))
    return {
      stages: [{ label, rows: states }],
      nextRows: rows,
    }
  }

  const states: RowState[] = rows.map((_, i) => ({
    dim: false,
    group: null,
    pos: i,
  }))
  states.push({
    dim: false,
    group: 1,
    pos: rows.length,
    values: newRow,
    isNew: true,
  })
  return {
    stages: [{ label, rows: states }],
    nextRows: [...rows, newRow],
  }
}

export function runMutation(
  mutation: SqlMutation,
  table: TableShape,
  rows: (string | null)[][],
  allTables: Map<string, TableShape>,
): MutationRun {
  switch (mutation.kind) {
    case 'update':
      return runUpdate(mutation, table, rows)
    case 'delete':
      return runDelete(mutation, table, rows)
    case 'insert':
      return runInsert(mutation, table, rows, allTables)
  }
}
