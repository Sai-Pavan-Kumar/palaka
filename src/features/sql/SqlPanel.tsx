import { useState } from 'react'
import { useEngineStore } from '../engine/engineStore'
import { findPage } from '../engine/model/documentOps'
import type { TableShape } from '../engine/model/types'
import { useSessionStore } from '../engine/sessionStore'
import { useNotesStore } from '../notes/pageNotes'
import {
  buildDeleteRow,
  buildInsertRow,
  buildJoinQuery,
  buildSelectAll,
  buildSelectWhere,
  buildUpdateRow,
} from './builder/sqlTemplates'
import { insertSqlTables } from './insertTables'
import { parseSql } from './parseSql'
import './sqlPanel.css'

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
  if (result.mutations > 0) {
    lines.push(`${plural(result.mutations, 'mutation')} animated.`)
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

function QueryChips({
  tables,
  onAppend,
}: {
  tables: TableShape[]
  onAppend: (s: string) => void
}) {
  const [t1, t2] = tables
  return (
    <>
      <button
        type="button"
        className="sql-panel__chip"
        onClick={() => onAppend(buildSelectAll(t1))}
      >
        + SELECT
      </button>
      <button
        type="button"
        className="sql-panel__chip"
        onClick={() => onAppend(buildSelectWhere(t1))}
      >
        + WHERE
      </button>
      {t2 && (
        <button
          type="button"
          className="sql-panel__chip"
          onClick={() => onAppend(buildJoinQuery(t1, t2, 'JOIN'))}
        >
          + JOIN
        </button>
      )}
    </>
  )
}

function MutationChips({
  table,
  onAppend,
}: {
  table: TableShape
  onAppend: (s: string) => void
}) {
  return (
    <>
      <button
        type="button"
        className="sql-panel__chip"
        onClick={() => onAppend(buildInsertRow(table))}
      >
        + INSERT
      </button>
      <button
        type="button"
        className="sql-panel__chip"
        onClick={() => onAppend(buildUpdateRow(table))}
      >
        + UPDATE
      </button>
      <button
        type="button"
        className="sql-panel__chip"
        onClick={() => onAppend(buildDeleteRow(table))}
      >
        + DELETE
      </button>
    </>
  )
}

function SnippetRow({
  tables,
  onAppend,
}: {
  tables: TableShape[]
  onAppend: (snippet: string) => void
}) {
  return (
    <div className="sql-panel__snippets" aria-label="SQL snippets">
      <QueryChips tables={tables} onAppend={onAppend} />
      <MutationChips table={tables[0]} onAppend={onAppend} />
    </div>
  )
}

function SqlActions({
  canInsert,
  onInsert,
  showExample,
  onExample,
}: {
  canInsert: boolean
  onInsert: () => void
  showExample: boolean
  onExample: () => void
}) {
  return (
    <div className="sql-panel__actions">
      <button
        type="button"
        className="sql-panel__insert"
        disabled={!canInsert}
        onClick={onInsert}
      >
        Insert tables
      </button>
      {showExample && (
        <button
          type="button"
          className="sql-panel__example"
          onClick={onExample}
        >
          Try an example
        </button>
      )}
    </div>
  )
}

function SqlOutcome({ outcome }: { outcome: Outcome }) {
  return (
    <div className={`sql-panel__outcome is-${outcome.tone}`} role="status">
      {outcome.lines.map((line) => (
        <p key={line}>{line}</p>
      ))}
    </div>
  )
}

export function SqlPanel() {
  const pageId = useSessionStore((s) => s.pageId)
  const doc = useEngineStore((s) => s.doc)
  const page = findPage(doc, pageId)
  const sql = useNotesStore((s) => s.sql[pageId] ?? '')
  const setSql = useNotesStore((s) => s.setSql)
  const [outcome, setOutcome] = useState<Outcome | null>(null)

  const tables = page
    ? Object.values(page.shapes).filter(
        (shape): shape is TableShape =>
          shape.type === 'table' && !shape.fromQuery,
      )
    : []

  const appendSnippet = (snippet: string) => {
    const trimmed = sql.trim()
    const next = trimmed ? `${trimmed}\n\n${snippet}` : snippet
    setSql(pageId, next)
  }

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
      {tables.length > 0 && (
        <SnippetRow tables={tables} onAppend={appendSnippet} />
      )}
      <SqlActions
        canInsert={sql.trim() !== ''}
        onInsert={() => setOutcome(insert(sql))}
        showExample={sql.trim() === ''}
        onExample={() => setSql(pageId, EXAMPLE_SQL)}
      />
      {outcome && <SqlOutcome outcome={outcome} />}
    </div>
  )
}
