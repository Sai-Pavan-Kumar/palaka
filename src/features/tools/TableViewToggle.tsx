import { Grid3x3, List } from 'lucide-react'
import { IconButton } from '../../shared/ui/IconButton'
import { useEngineStore } from '../engine/engineStore'
import { findPage } from '../engine/model/documentOps'
import { getTableView } from '../engine/model/tableLayout'
import { getSelectedTables, setTableView } from '../engine/tableActions'
import { useSessionStore } from '../engine/sessionStore'

// Only for tables that have sample rows: flip between the column list
// (keys, types, FK arrows on rows) and the data grid.
export function TableViewToggle() {
  const doc = useEngineStore((s) => s.doc)
  const pageId = useSessionStore((s) => s.pageId)
  const selectedIds = useSessionStore((s) => s.selectedIds)
  const page = findPage(doc, pageId)
  const tables = (page ? getSelectedTables(page, selectedIds) : []).filter(
    (table) => (table.rows?.length ?? 0) > 0,
  )
  if (tables.length === 0) return null
  const showsData = tables.every((table) => getTableView(table) === 'data')
  return (
    <IconButton
      icon={showsData ? List : Grid3x3}
      label={showsData ? 'Show columns' : 'Show data rows'}
      onClick={() => setTableView(showsData ? 'schema' : 'data')}
    />
  )
}
