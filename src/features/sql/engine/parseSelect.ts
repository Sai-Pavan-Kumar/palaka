import { splitTopLevel } from '../sqlText'
import { columnName, parseExpr, type Expr } from './expr'

export type Aggregate = 'count' | 'sum' | 'avg' | 'min' | 'max'

export type JoinType = 'inner' | 'left' | 'right' | 'full'

export type TableRef = {
  name: string
  alias?: string
}

export type JoinClause = {
  type: JoinType
  table: TableRef
  on: Expr
  text: string
}

export type SelectItem =
  | { kind: 'all' }
  | { kind: 'column'; column: string; label: string }
  | { kind: 'aggregate'; fn: Aggregate; column: string | null; label: string }

export type SelectQuery = {
  items: SelectItem[]
  table: string
  from: TableRef
  joins: JoinClause[]
  where: Expr | null
  groupBy: string[]
  orderBy: { column: string; desc: boolean }[]
  limit: number | null
  // The clause text as typed, used to name each reveal step.
  text: {
    from?: string
    where?: string
    groupBy?: string
    orderBy?: string
    limit?: string
  }
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
  const rawCol = col[1]
  const unqualified = (rawCol.split('.').pop() ?? rawCol).replace(
    /["`[\]]/g,
    '',
  )
  return {
    kind: 'column',
    column: columnName(rawCol),
    label: col[2] ?? unqualified,
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

function parseTableRef(text: string): TableRef {
  const match = /^([\w$."`[\]]+)(?:\s+(?:as\s+)?([\w$]+))?$/i.exec(text.trim())
  if (!match) throw new Error(`Could not read table name: "${text}"`)
  const name = (match[1].split('.').pop() ?? match[1])
    .replace(/["`[\]]/g, '')
    .toLowerCase()
  const alias = match[2]?.replace(/["`[\]]/g, '').toLowerCase()
  return { name, alias }
}

const JOIN_REGEX =
  /\b(inner\s+join|left\s+outer\s+join|left\s+join|right\s+outer\s+join|right\s+join|full\s+outer\s+join|full\s+join|join)\b/gi

function parseFromAndJoins(text: string): {
  from: TableRef
  joins: JoinClause[]
} {
  if (text.includes(',')) {
    throw new Error('Comma joins are not supported; use JOIN … ON …')
  }
  const matches = [...text.matchAll(JOIN_REGEX)]
  if (matches.length === 0) {
    return { from: parseTableRef(text), joins: [] }
  }
  const fromPart = text.slice(0, matches[0].index).trim()
  const from = parseTableRef(fromPart)
  const joins: JoinClause[] = []
  for (let i = 0; i < matches.length; i++) {
    const m = matches[i]
    const raw = m[1].toLowerCase().replace(/\s+/g, ' ')
    let type: JoinType = 'inner'
    if (raw.startsWith('left')) type = 'left'
    else if (raw.startsWith('right')) type = 'right'
    else if (raw.startsWith('full')) type = 'full'

    const start = (m.index ?? 0) + m[0].length
    const end =
      i + 1 < matches.length
        ? (matches[i + 1].index ?? text.length)
        : text.length
    const chunk = text.slice(start, end).trim()
    const onIndex = chunk.search(/\bon\b/i)
    if (onIndex === -1) {
      throw new Error(`JOIN requires an ON condition: "${m[0]} ${chunk}"`)
    }
    const tablePart = chunk.slice(0, onIndex).trim()
    const onPart = chunk.slice(onIndex + 2).trim()
    if (!onPart) throw new Error(`Empty ON condition after JOIN`)
    joins.push({
      type,
      table: parseTableRef(tablePart),
      on: parseExpr(onPart),
      text: onPart,
    })
  }
  return { from, joins }
}

// SELECT on one table or with JOINs. Throws a readable message for anything
// outside the subset, so nothing animates wrongly.
export function parseSelect(sql: string): SelectQuery {
  const clauses = splitClauses(sql.trim().replace(/;$/, ''))
  const fromText = clauses.get('from')
  if (!clauses.has('select') || !fromText)
    throw new Error('Expected SELECT … FROM …')
  if (/\bhaving\b/i.test(sql)) throw new Error('HAVING is not supported yet')
  const limitText = clauses.get('limit')
  if (limitText !== undefined && !/^\d+$/.test(limitText)) {
    throw new Error(`LIMIT needs a number: ${limitText}`)
  }
  const { from, joins } = parseFromAndJoins(fromText)
  return {
    items: splitTopLevel(clauses.get('select')!, ',').map(parseItem),
    table: from.name,
    from,
    joins,
    where: clauses.has('where') ? parseExpr(clauses.get('where')!) : null,
    groupBy: clauses.has('group by')
      ? splitTopLevel(clauses.get('group by')!, ',').map(columnName)
      : [],
    orderBy: clauses.has('order by')
      ? parseOrder(clauses.get('order by')!)
      : [],
    limit: limitText === undefined ? null : Number(limitText),
    text: {
      from: fromText,
      where: clauses.get('where'),
      groupBy: clauses.get('group by'),
      orderBy: clauses.get('order by'),
      limit: limitText,
    },
  }
}
