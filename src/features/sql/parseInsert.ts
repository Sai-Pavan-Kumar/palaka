import {
  cleanIdentifier,
  identifierList,
  IDENT,
  splitTopLevel,
} from './sqlText'

export type SqlValue = string | null

export type SqlInsert = {
  table: string
  // Null = no column list: values follow the table's column order.
  columns: string[] | null
  rows: SqlValue[][]
}

const INSERT_HEAD = new RegExp(
  String.raw`^insert\s+(?:ignore\s+)?into\s+(${IDENT})\s*(?:\(([^)]*)\))?\s*values\s*([\s\S]*)$`,
  'i',
)

// Values stay as the text the teacher typed ('Asha' → Asha, 42 → 42), so the
// board shows exactly what was written. NULL is a real null.
function parseValue(raw: string): SqlValue {
  const text = raw.trim()
  if (/^null$/i.test(text)) return null
  const quoted = /^'([\s\S]*)'$/.exec(text)
  return quoted ? quoted[1].replace(/''/g, "'") : text
}

function parseTuple(tuple: string): SqlValue[] | null {
  const inner = /^\(([\s\S]*)\)$/.exec(tuple.trim())
  return inner ? splitTopLevel(inner[1], ',').map(parseValue) : null
}

// One INSERT … VALUES (…), (…). Returns a message when it cannot be read.
export function parseInsert(statement: string): SqlInsert | string {
  const head = INSERT_HEAD.exec(statement.trim())
  if (!head) return 'Only INSERT … VALUES (…) is supported for sample rows.'
  const rows = splitTopLevel(head[3], ',').map(parseTuple)
  const table = cleanIdentifier(head[1])
  if (rows.length === 0 || rows.some((row) => row === null)) {
    return `Could not read the VALUES of INSERT INTO ${table}.`
  }
  return {
    table,
    columns: head[2] ? identifierList(head[2]) : null,
    rows: rows as SqlValue[][],
  }
}
