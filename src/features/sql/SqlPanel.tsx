import { useState } from 'react'
import { useSessionStore } from '../engine/sessionStore'
import { useNotesStore } from '../notes/pageNotes'
import { insertSqlTables } from './insertTables'
import { parseSql } from './parseSql'
import './sqlPanel.css'

// Shown on an empty panel, so the first try needs no SQL at hand.
const EXAMPLE_SQL = `CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE
);

CREATE TABLE orders (
  id BIGSERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id),
  total NUMERIC(10, 2)
);`

type Outcome = { tone: 'ok' | 'error'; lines: string[] }

function plural(count: number, word: string, many = `${word}s`): string {
  return `${count} ${count === 1 ? word : many}`
}

function insert(sql: string): Outcome {
  const parsed = parseSql(sql)
  if (parsed.tables.length === 0) {
    const errors = parsed.errors
    return {
      tone: 'error',
      lines: errors.length > 0 ? errors : ['No CREATE TABLE found.'],
    }
  }
  const result = insertSqlTables(parsed)
  const rowCount = parsed.tables.reduce((sum, t) => sum + t.rows.length, 0)
  const lines = [
    `${plural(result.added, 'table')} added, ${result.updated} updated, ${plural(result.arrows, 'relation')}.`,
  ]
  if (result.queries > 0) {
    lines.push(`${plural(result.queries, 'query', 'queries')} animated.`)
  }
  if (rowCount > 0 || result.highlights > 0) {
    lines.push(
      `${plural(rowCount, 'sample row')}, ${plural(result.highlights, 'highlight step')}.`,
    )
  }
  if (parsed.skipped.length > 0) {
    lines.push(`Skipped: ${parsed.skipped.join(', ')}.`)
  }
  const errors = [...parsed.errors, ...result.errors]
  return {
    tone: errors.length > 0 ? 'error' : 'ok',
    lines: [...lines, ...errors],
  }
}

// Paste CREATE TABLE statements, press Insert: tables and their foreign-key
// arrows land on this page. Insert again after an edit updates them in
// place, so the schema can change while you explain it.
export function SqlPanel() {
  const pageId = useSessionStore((s) => s.pageId)
  const sql = useNotesStore((s) => s.sql[pageId] ?? '')
  const setSql = useNotesStore((s) => s.setSql)
  const [outcome, setOutcome] = useState<Outcome | null>(null)

  return (
    <div className="sql-panel">
      <textarea
        className="sql-panel__input"
        value={sql}
        spellCheck={false}
        aria-label="SQL for this page"
        placeholder="Paste CREATE TABLE statements here"
        onChange={(event) => setSql(pageId, event.target.value)}
      />
      <div className="sql-panel__actions">
        <button
          type="button"
          className="sql-panel__insert"
          disabled={sql.trim() === ''}
          onClick={() => setOutcome(insert(sql))}
        >
          Insert tables
        </button>
        {sql.trim() === '' && (
          <button
            type="button"
            className="sql-panel__example"
            onClick={() => setSql(pageId, EXAMPLE_SQL)}
          >
            Try an example
          </button>
        )}
      </div>
      {outcome && (
        <div className={`sql-panel__outcome is-${outcome.tone}`} role="status">
          {outcome.lines.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </div>
      )}
    </div>
  )
}
