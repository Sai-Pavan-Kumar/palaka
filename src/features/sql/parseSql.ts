import { applyInserts } from './applyInserts'
import { parseHighlights, type SqlColumnRef } from './parseHighlights'
import { parseInsert, type SqlInsert, type SqlValue } from './parseInsert'
import {
  cleanIdentifier,
  firstParenBody,
  identifierList,
  IDENT,
  splitTopLevel,
  stripComments,
} from './sqlText'

export type SqlColumn = {
  name: string
  type: string
  pk: boolean
  notNull: boolean
  unique: boolean
  // Empty column = "the parent's primary key", filled in after parsing.
  fk?: { table: string; column: string }
}

export type SqlTable = {
  name: string
  columns: SqlColumn[]
  // Sample rows from INSERT statements, in column order.
  rows: SqlValue[][]
}

export type SqlParseResult = {
  tables: SqlTable[]
  // From "-- highlight a.x -> b.y" comments: each entry is one reveal step.
  highlights: SqlColumnRef[][]
  // SELECT statements, animated clause by clause on their table.
  queries: string[]
  // Statements we do not draw (INSERT, CREATE INDEX…): listed, not errors.
  skipped: string[]
  errors: string[]
}

const CREATE_TABLE = new RegExp(
  String.raw`^create\s+(?:(?:global\s+|local\s+)?temp(?:orary)?\s+)?table\s+(?:if\s+not\s+exists\s+)?(${IDENT})\s*\(`,
  'i',
)
const TABLE_CONSTRAINT =
  /^(constraint\b|primary\s+key\b|foreign\s+key\b|unique\b|check\b|key\b|index\b|exclude\b)/i
// Where a column's type ends and its options begin.
const COLUMN_OPTION =
  /\s(primary|not|null|unique|default|references|constraint|check|auto_increment|autoincrement|generated|collate|identity|comment|on)\b/i
const REFERENCES = new RegExp(
  String.raw`references\s+(${IDENT})\s*(?:\(([^)]*)\))?`,
  'i',
)
const COLUMN_START = new RegExp(String.raw`^(${IDENT})\s*(.*)$`, 's')

function parseColumn(definition: string): SqlColumn | null {
  const match = COLUMN_START.exec(definition)
  if (!match) return null
  const rest = ` ${match[2]}`
  const optionAt = rest.search(COLUMN_OPTION)
  const type = (optionAt === -1 ? rest : rest.slice(0, optionAt)).trim()
  const options = optionAt === -1 ? '' : rest.slice(optionAt)
  const ref = REFERENCES.exec(options)
  return {
    name: cleanIdentifier(match[1]),
    type: type.replace(/\s+/g, ' '),
    pk: /\bprimary\s+key\b/i.test(options),
    notNull: /\bnot\s+null\b/i.test(options),
    unique: /\bunique\b/i.test(options),
    ...(ref && {
      fk: {
        table: cleanIdentifier(ref[1]),
        column: ref[2] ? identifierList(ref[2])[0] : '',
      },
    }),
  }
}

function columnsIn(group: string | undefined): string[] {
  return group ? identifierList(group) : []
}

// PRIMARY KEY (a, b) / FOREIGN KEY (a) REFERENCES t (b) / UNIQUE (a).
function applyConstraint(constraint: string, columns: SqlColumn[]): void {
  const find = (name: string) =>
    columns.find((c) => c.name.toLowerCase() === name.toLowerCase())
  const primary = /primary\s+key\s*\(([^)]*)\)/i.exec(constraint)
  for (const name of columnsIn(primary?.[1])) {
    const column = find(name)
    if (column) column.pk = true
  }
  const unique =
    /^(?:constraint\s+\S+\s+)?unique\s*(?:key\s*)?\(([^)]*)\)/i.exec(constraint)
  const uniqueColumns = columnsIn(unique?.[1])
  if (uniqueColumns.length === 1) {
    const column = find(uniqueColumns[0])
    if (column) column.unique = true
  }
  const foreign = /foreign\s+key\s*\(([^)]*)\)/i.exec(constraint)
  const ref = REFERENCES.exec(constraint)
  if (!foreign || !ref) return
  const parentColumns = columnsIn(ref[2])
  columnsIn(foreign[1]).forEach((name, index) => {
    const column = find(name)
    if (column) {
      column.fk = {
        table: cleanIdentifier(ref[1]),
        column: parentColumns[index] ?? '',
      }
    }
  })
}

function parseCreateTable(statement: string): SqlTable | string {
  const head = CREATE_TABLE.exec(statement)
  const name = head ? cleanIdentifier(head[1]) : 'table'
  const body = firstParenBody(statement)
  if (!head || body === null)
    return `Could not read "${name}": brackets do not match.`
  const columns: SqlColumn[] = []
  const constraints: string[] = []
  for (const part of splitTopLevel(body, ',')) {
    if (TABLE_CONSTRAINT.test(part)) constraints.push(part)
    else {
      const column = parseColumn(part)
      if (column) columns.push(column)
    }
  }
  for (const constraint of constraints) applyConstraint(constraint, columns)
  if (columns.length === 0) return `Table "${name}" has no columns.`
  return { name, columns, rows: [] }
}

// "REFERENCES users" without a column means the parent's primary key.
function resolveForeignKeys(tables: SqlTable[]): void {
  const byName = new Map(tables.map((t) => [t.name.toLowerCase(), t]))
  for (const column of tables.flatMap((t) => t.columns)) {
    if (!column.fk || column.fk.column) continue
    const parent = byName.get(column.fk.table.toLowerCase())
    column.fk.column = parent?.columns.find((c) => c.pk)?.name ?? 'id'
  }
}

function describeSkipped(statement: string): string {
  return statement.split(/\s+/).slice(0, 3).join(' ')
}

function readStatement(
  statement: string,
  result: SqlParseResult,
  inserts: SqlInsert[],
): void {
  if (/^insert\s/i.test(statement)) {
    const insert = parseInsert(statement)
    if (typeof insert === 'string') result.errors.push(insert)
    else inserts.push(insert)
  } else if (/^select\s/i.test(statement)) {
    result.queries.push(statement)
  } else if (/^create\s+(?:\w+\s+)*?table\b/i.test(statement)) {
    const table = parseCreateTable(statement)
    if (typeof table === 'string') result.errors.push(table)
    else result.tables.push(table)
  } else {
    result.skipped.push(describeSkipped(statement))
  }
}

export function parseSql(sql: string): SqlParseResult {
  const { highlights, errors } = parseHighlights(sql)
  const result: SqlParseResult = {
    tables: [],
    highlights,
    queries: [],
    skipped: [],
    errors,
  }
  const inserts: SqlInsert[] = []
  for (const statement of splitTopLevel(stripComments(sql), ';', true)) {
    readStatement(statement, result, inserts)
  }
  resolveForeignKeys(result.tables)
  applyInserts(result, inserts)
  return result
}
