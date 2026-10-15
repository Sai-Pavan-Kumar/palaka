import {
  BOTTOM_PAD,
  HEADER_H,
  MARKER_W,
  MIN_W,
  PAD_X,
  ROW_H,
  TABLE_ROW_PX,
  textWidth,
} from './tableLayout'
import type { TableColumn, TableShape } from './types'

// The owner's limit: more rows than this stop reading on video.
export const MAX_GRID_ROWS = 8
export const NULL_TEXT = 'NULL'

export type GridColumn = { column: TableColumn; x: number; w: number }
export type GridRow = {
  values: (string | null)[]
  top: number
  centreY: number
}

export type TableGrid = {
  x: number
  y: number
  w: number
  h: number
  headerH: number
  rowH: number
  padX: number
  // The row of column names under the table name.
  columnsTop: number
  columns: GridColumn[]
  rows: GridRow[]
  // Rows not shown ("+3 more"); 0 when all fit.
  hidden: number
}

function columnWidth(table: TableShape, index: number): number {
  const column = table.columns[index]
  const marker = column.pk || column.fk ? MARKER_W : 0
  const values = (table.rows ?? [])
    .slice(0, MAX_GRID_ROWS)
    .map((row) => textWidth(row[index] ?? NULL_TEXT, 'code', TABLE_ROW_PX))
  const name = textWidth(column.name, 'code', TABLE_ROW_PX) + marker
  return Math.max(name, ...values) + PAD_X * 2
}

// Columns across, sample rows down: how a viewer pictures a table of data.
export function getTableGrid(table: TableShape): TableGrid {
  const s = table.scale
  const headerH = HEADER_H * s
  const rowH = ROW_H * s
  const all = table.rows ?? []
  const shown = all.slice(0, MAX_GRID_ROWS)
  const hidden = all.length - shown.length
  let cursor = table.x
  const columns = table.columns.map((column, index) => {
    const w = columnWidth(table, index) * s
    const cell = { column, x: cursor, w }
    cursor += w
    return cell
  })
  const contentW = cursor - table.x
  const columnsTop = table.y + headerH
  const rows = shown.map((values, index) => {
    const top = columnsTop + rowH * (index + 1)
    return { values, top, centreY: top + rowH / 2 }
  })
  const lineCount = 1 + shown.length + (hidden > 0 ? 1 : 0)
  return {
    x: table.x,
    y: table.y,
    w: Math.max(MIN_W * s, contentW),
    h: headerH + lineCount * rowH + BOTTOM_PAD * s,
    headerH,
    rowH,
    padX: PAD_X * s,
    columnsTop,
    columns,
    rows,
    hidden,
  }
}
