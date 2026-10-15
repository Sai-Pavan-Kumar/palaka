import { splitTopLevel } from '../sqlText'
import { columnName, parseExpr, type Expr } from './expr'

export type Aggregate = 'count' | 'sum' | 'avg' | 'min' | 'max'

export type SelectItem =
  | { kind: 'all' }
  | { kind: 'column'; column: string; label: string }
  | { kind: 'aggregate'; fn: Aggregate; column: string | null; label: string }

export type SelectQuery = {
  items: SelectItem[]
  table: string
  where: Expr | null
  groupBy: string[]
  orderBy: { column: string; desc: boolean }[]
  limit: number | null
  // The clause text as typed, used to name each reveal step.
  text: { where?: string; groupBy?: string; orderBy?: string; limit?: string }
}

const CLAUSES = ['select', 'from', 'where', 'group by', 'order by', 'limit']

// Blanks out quoted text so keywords inside 'strings' are never matched.
function maskQuotes(sql: string): string {
  return sql.replace(/'(?:[^']|'')*'/g, (m) => ' '.repeat(m.length))
}

function splitClauses(sql: string): Map<string, string> {
  const masked = maskQuotes(sql)
  const found: { name: string; at: number; end: number }[] = []
  for (const name of CLAUSES) {
    const pattern = new RegExp(`\\b${name.replace(' ', '\\s+')}\\b`, 'i')
    const match = pattern.exec(masked)
    if (match)
      found.push({ name, at: match.index, end: match.index + match[0].length })
  }
  found.sort((a, b) => a.at - b.at)
  const clauses = new Map<string, string>()
  found.forEach((clause, i) => {
    const stop = found[i + 1]?.at ?? sql.length
    clauses.set(clause.name, sql.slice(clause.end, stop).trim())
  })
  return clauses
}

const AGGREGATE =
  /^(count|sum|avg|min|max)\s*\(\s*(\*|[\w$."`[\]]+)\s*\)(?:\s+as\s+(\w+))?$/i
const COLUMN = /^([\w$."`[\]]+)(?:\s+as\s+(\w+))?$/i

function parseItem(text: string): SelectItem {
  if (text === '*') return { kind: 'all' }
  const agg = AGGREGATE.exec(text)
  if (agg) {
    const column = agg[2] === '*' ? null : columnName(agg[2])
    return {
      kind: 'aggregate',
      fn: agg[1].toLowerCase() as Aggregate,
      column,
      label: agg[3] ?? text.replace(/\s+/g, ''),
    }
  }
  const col = COLUMN.exec(text)
  if (!col) throw new Error(`Not supported yet in SELECT: ${text}`)
  return {
    kind: 'column',
    column: columnName(col[1]),
    label: col[2] ?? columnName(col[1]),
  }
}

function parseOrder(text: string) {
  return splitTopLevel(text, ',').map((part) => {
    const match = /^([\w$."`[\]]+)(?:\s+(asc|desc))?$/i.exec(part)
    if (!match) throw new Error(`Not supported yet in ORDER BY: ${part}`)
    return {
      column: columnName(match[1]),
      desc: match[2]?.toLowerCase() === 'desc',
    }
  })
}

// One SELECT on one table (JOIN comes in phase 4c). Throws a readable
// message for anything outside the subset, so nothing animates wrongly.
export function parseSelect(sql: string): SelectQuery {
  const clauses = splitClauses(sql.trim().replace(/;$/, ''))
  const from = clauses.get('from')
  if (!clauses.has('select') || !from)
    throw new Error('Expected SELECT … FROM …')
  if (/\bjoin\b/i.test(from) || from.includes(',')) {
    throw new Error('JOIN is not supported yet (coming in the next phase)')
  }
  if (/\bhaving\b/i.test(sql)) throw new Error('HAVING is not supported yet')
  const limitText = clauses.get('limit')
  if (limitText !== undefined && !/^\d+$/.test(limitText)) {
    throw new Error(`LIMIT needs a number: ${limitText}`)
  }
  return {
    items: splitTopLevel(clauses.get('select')!, ',').map(parseItem),
    table: columnName(from.split(/\s+/)[0]),
    where: clauses.has('where') ? parseExpr(clauses.get('where')!) : null,
    groupBy: clauses.has('group by')
      ? splitTopLevel(clauses.get('group by')!, ',').map(columnName)
      : [],
    orderBy: clauses.has('order by')
      ? parseOrder(clauses.get('order by')!)
      : [],
    limit: limitText === undefined ? null : Number(limitText),
    text: {
      where: clauses.get('where'),
      groupBy: clauses.get('group by'),
      orderBy: clauses.get('order by'),
      limit: limitText,
    },
  }
}
