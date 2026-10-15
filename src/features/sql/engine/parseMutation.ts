import { splitTopLevel } from '../sqlText'
import { columnName, parseExpr, type Expr } from './expr'

export type UpdateMutation = {
  kind: 'update'
  table: string
  assignments: { column: string; value: string | null }[]
  where: Expr | null
  text: { set: string; where?: string }
}

export type DeleteMutation = {
  kind: 'delete'
  table: string
  where: Expr | null
  text: { where?: string }
}

export type InsertMutation = {
  kind: 'insert'
  table: string
  columns?: string[]
  values: (string | null)[][]
  text: { values: string }
}

export type SqlMutation = UpdateMutation | DeleteMutation | InsertMutation

function cleanName(raw: string): string {
  return (raw.split('.').pop() ?? raw)
    .replace(/["`[\]]/g, '')
    .trim()
    .toLowerCase()
}

function parseAssignmentValue(raw: string): string | null {
  const val = raw.trim()
  if (/^null$/i.test(val)) return null
  if (/^'(?:[^']|'')*'$/.test(val)) {
    return val.slice(1, -1).replace(/''/g, "'")
  }
  return val
}

function parseAssignments(
  text: string,
): { column: string; value: string | null }[] {
  return splitTopLevel(text, ',').map((part) => {
    const match = /^([\w$."`[\]]+)\s*=\s*(.*)$/s.exec(part.trim())
    if (!match) throw new Error(`Invalid assignment in SET: "${part}"`)
    return {
      column: columnName(match[1]),
      value: parseAssignmentValue(match[2]),
    }
  })
}

export function parseUpdate(sql: string): UpdateMutation {
  const match = /^update\s+([\w$."`[\]]+)\s+set\s+(.*)$/is.exec(
    sql.trim().replace(/;$/, ''),
  )
  if (!match) throw new Error('Expected UPDATE <table> SET <assignments>')
  const table = cleanName(match[1])
  const rest = match[2]
  const whereMatch = /\bwhere\b/i.exec(rest)
  const setText = whereMatch
    ? rest.slice(0, whereMatch.index).trim()
    : rest.trim()
  const whereText = whereMatch
    ? rest.slice(whereMatch.index + 5).trim()
    : undefined
  return {
    kind: 'update',
    table,
    assignments: parseAssignments(setText),
    where: whereText ? parseExpr(whereText) : null,
    text: { set: setText, where: whereText },
  }
}

export function parseDelete(sql: string): DeleteMutation {
  const match = /^delete\s+from\s+([\w$."`[\]]+)(?:\s+where\s+(.*))?$/is.exec(
    sql.trim().replace(/;$/, ''),
  )
  if (!match)
    throw new Error('Expected DELETE FROM <table> [WHERE <condition>]')
  const table = cleanName(match[1])
  const whereText = match[2]?.trim()
  return {
    kind: 'delete',
    table,
    where: whereText ? parseExpr(whereText) : null,
    text: { where: whereText },
  }
}

function parseValueRow(rowText: string): (string | null)[] {
  const inner = rowText.trim().replace(/^\(/, '').replace(/\)$/, '')
  return splitTopLevel(inner, ',').map(parseAssignmentValue)
}

export function parseInsertMutation(sql: string): InsertMutation {
  const cleaned = sql.replace(/^\s*--[^\n]*\n?/gm, '').trim()
  const match =
    /^insert\s+into\s+([\w$."`[\]]+)(?:\s*\(([^)]+)\))?\s+values\s*(.*)$/is.exec(
      cleaned.replace(/;$/, ''),
    )
  if (!match) {
    throw new Error('Expected INSERT INTO <table> [(cols)] VALUES (...)')
  }
  const table = cleanName(match[1])
  const columns = match[2]
    ? splitTopLevel(match[2], ',').map((c) => cleanName(c))
    : undefined
  const valuesText = match[3].trim()
  const rows = splitTopLevel(valuesText, ',').map(parseValueRow)
  return {
    kind: 'insert',
    table,
    columns,
    values: rows,
    text: { values: valuesText },
  }
}

export function isMutationStatement(sql: string): boolean {
  const s = sql.replace(/^\s*--[^\n]*\n?/gm, '').trim()
  return /^(update|delete|insert)\b/i.test(s)
}
