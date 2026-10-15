import { getTableGrid } from './tableGrid'
import { getTableLayout, getTableView } from './tableLayout'
import type { TableShape } from './types'

// A table's size depends on how it is shown: a column list or a data grid.
export function getTableBox(table: TableShape) {
  const { x, y, w, h } =
    getTableView(table) === 'data' ? getTableGrid(table) : getTableLayout(table)
  return { x, y, w, h }
}
