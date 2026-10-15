import {
  ArrowUpDown,
  Database,
  GitMerge,
  Highlighter,
  ListFilter,
  Pencil,
  Play,
  Plus,
  Trash2,
  type LucideIcon,
} from 'lucide-react'
import { IconButton } from '../../shared/ui/IconButton'
import { Popover } from '../../shared/ui/Popover'
import { useEngineStore } from '../engine/engineStore'
import { findPage } from '../engine/model/documentOps'
import type { TableShape } from '../engine/model/types'
import { useSessionStore } from '../engine/sessionStore'
import { getSelectedTables } from '../engine/tableActions'
import { applySqlSnippet } from '../sql/builder/applySqlSnippet'
import {
  buildDeleteRow,
  buildHighlightColumn,
  buildInsertRow,
  buildJoinHighlight,
  buildJoinQuery,
  buildSelectAll,
  buildSelectOrderLimit,
  buildSelectWhere,
  buildUpdateRow,
} from '../sql/builder/sqlTemplates'
import './sqlActionMenu.css'

type ApplyFn = (sql: string, title: string) => void

const JOIN_KINDS: {
  type: 'JOIN' | 'LEFT JOIN' | 'RIGHT JOIN' | 'FULL JOIN'
  label: string
}[] = [
  { type: 'JOIN', label: 'INNER JOIN (matches only)' },
  { type: 'LEFT JOIN', label: 'LEFT JOIN (all left)' },
  { type: 'RIGHT JOIN', label: 'RIGHT JOIN (all right)' },
  { type: 'FULL JOIN', label: 'FULL JOIN (all rows)' },
]

function MenuItem({
  icon: Icon,
  label,
  onClick,
}: {
  icon: LucideIcon
  label: string
  onClick: () => void
}) {
  return (
    <button type="button" className="sql-menu__item" onClick={onClick}>
      <Icon size={16} />
      <span>{label}</span>
    </button>
  )
}

function QueryActions({
  table,
  onApply,
}: {
  table: TableShape
  onApply: ApplyFn
}) {
  return (
    <>
      <span className="sql-menu__title">Queries · {table.name}</span>
      <MenuItem
        icon={Play}
        label={`SELECT * FROM ${table.name}`}
        onClick={() =>
          onApply(buildSelectAll(table), `SELECT * FROM ${table.name}`)
        }
      />
      <MenuItem
        icon={ListFilter}
        label="Filter with WHERE"
        onClick={() => onApply(buildSelectWhere(table), 'Filter query')}
      />
      <MenuItem
        icon={ArrowUpDown}
        label="Sort & LIMIT"
        onClick={() => onApply(buildSelectOrderLimit(table), 'ORDER BY query')}
      />
    </>
  )
}

function MutationActions({
  table,
  onApply,
}: {
  table: TableShape
  onApply: ApplyFn
}) {
  return (
    <>
      <span className="sql-menu__divider" />
      <span className="sql-menu__title">Mutations</span>
      <MenuItem
        icon={Plus}
        label="INSERT sample row"
        onClick={() => onApply(buildInsertRow(table), 'INSERT row')}
      />
      <MenuItem
        icon={Pencil}
        label="UPDATE row"
        onClick={() => onApply(buildUpdateRow(table), 'UPDATE row')}
      />
      <MenuItem
        icon={Trash2}
        label="DELETE row"
        onClick={() => onApply(buildDeleteRow(table), 'DELETE row')}
      />
    </>
  )
}

function SingleTableActions({
  table,
  onApply,
}: {
  table: TableShape
  onApply: ApplyFn
}) {
  return (
    <div className="sql-menu__section">
      <QueryActions table={table} onApply={onApply} />
      <MutationActions table={table} onApply={onApply} />
      <span className="sql-menu__divider" />
      <span className="sql-menu__title">Highlight</span>
      <MenuItem
        icon={Highlighter}
        label="Highlight key column"
        onClick={() => onApply(buildHighlightColumn(table), 'Highlight step')}
      />
    </div>
  )
}

function TwoTableActions({
  tables,
  onApply,
}: {
  tables: [TableShape, TableShape]
  onApply: ApplyFn
}) {
  const [t1, t2] = tables
  return (
    <div className="sql-menu__section">
      <span className="sql-menu__title">
        JOIN · {t1.name} + {t2.name}
      </span>
      {JOIN_KINDS.map((jk) => (
        <MenuItem
          key={jk.type}
          icon={GitMerge}
          label={jk.label}
          onClick={() => onApply(buildJoinQuery(t1, t2, jk.type), jk.label)}
        />
      ))}
      <span className="sql-menu__divider" />
      <span className="sql-menu__title">Highlight</span>
      <MenuItem
        icon={Highlighter}
        label="Highlight relation"
        onClick={() =>
          onApply(buildJoinHighlight(t1, t2), 'Highlight relation')
        }
      />
    </div>
  )
}

export function SqlActionMenu() {
  const doc = useEngineStore((s) => s.doc)
  const pageId = useSessionStore((s) => s.pageId)
  const selectedIds = useSessionStore((s) => s.selectedIds)
  const page = findPage(doc, pageId)
  const tables = page ? getSelectedTables(page, selectedIds) : []

  if (tables.length === 0 || tables.length > 2) return null

  return (
    <Popover
      side="below"
      trigger={({ isOpen, toggle }) => (
        <IconButton
          icon={Database}
          label="Build SQL queries & mutations"
          isActive={isOpen}
          onClick={toggle}
        />
      )}
    >
      {(close) => {
        const handleApply: ApplyFn = (sql, title) => {
          applySqlSnippet(sql, title)
          close()
        }
        return (
          <div className="sql-menu">
            {tables.length === 1 && (
              <SingleTableActions table={tables[0]} onApply={handleApply} />
            )}
            {tables.length === 2 && (
              <TwoTableActions
                tables={[tables[0], tables[1]]}
                onApply={handleApply}
              />
            )}
          </div>
        )
      }}
    </Popover>
  )
}
