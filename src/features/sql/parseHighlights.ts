export type SqlColumnRef = { table: string; column: string }

// A highlight is written as a comment, so the SQL still runs anywhere:
//   -- highlight orders.user_id -> users.id
//   -- highlight users.email, users.id
const HIGHLIGHT_LINE = /^\s*--\s*highlight\s+(.+)$/i

function parseRef(text: string): SqlColumnRef | null {
  const match =
    /^\s*["`[]?([\w$]+)["`\]]?\s*\.\s*["`[]?([\w$]+)["`\]]?\s*$/.exec(text)
  return match ? { table: match[1], column: match[2] } : null
}

export type HighlightParse = { highlights: SqlColumnRef[][]; errors: string[] }

export function parseHighlights(sql: string): HighlightParse {
  const result: HighlightParse = { highlights: [], errors: [] }
  for (const line of sql.split('\n')) {
    const match = HIGHLIGHT_LINE.exec(line)
    if (!match) continue
    const refs = match[1].split(/->|,/).map(parseRef)
    if (refs.length === 0 || refs.some((ref) => ref === null)) {
      result.errors.push(
        `Highlight "${match[1].trim()}": write it as table.column -> table.column.`,
      )
    } else {
      result.highlights.push(refs as SqlColumnRef[])
    }
  }
  return result
}
