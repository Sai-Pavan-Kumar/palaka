import type { TableColumn } from '../model/types'

// Shared by the column list and the data grid, so both read as one table.
export const MARKER_WEIGHT = 600
// Types and NULLs are supporting detail, so they sit back a little.
export const MUTED_OPACITY = 0.6
export const DIVIDER_OPACITY = 0.14
export const MARKER_SHARE = 0.75

export function columnMarker(column: TableColumn): string {
  if (column.pk) return 'PK'
  return column.fk ? 'FK' : ''
}
