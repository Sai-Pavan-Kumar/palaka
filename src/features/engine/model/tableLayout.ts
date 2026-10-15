import { FONT_SIZE } from './boardSpec'
import { measureText } from './textMetrics'
import type {
  FontKey,
  Point,
  TableColumn,
  TableShape,
  TableView,
} from './types'

// Slide pixels at scale 1. Rows are 26 px: smaller and a phone viewer of a
// 1080p video cannot read them; three tables still fit across 16:9.
export const HEADER_H = 68
export const ROW_H = 50
export const PAD_X = 20
export const BOTTOM_PAD = 8
export const MARKER_W = 48
const NAME_TYPE_GAP = 28
export const MIN_W = 260
export const TABLE_NAME_PX = 34
export const TABLE_ROW_PX = 26

export type TableRow = {
  column: TableColumn
  top: number
  centreY: number
}

export type TableLayout = {
  x: number
  y: number
  w: number
  h: number
  headerH: number
  rowH: number
  padX: number
  markerW: number
  rows: TableRow[]
}

export function textWidth(text: string, font: FontKey, px: number): number {
  return measureText({
    id: '',
    type: 'text',
    x: 0,
    y: 0,
    text,
    color: 'black',
    opacity: 1,
    font,
    size: 's',
    scale: px / FONT_SIZE.s,
  }).w
}

// Width follows the longest name + type, so nothing is ever cut off.
function contentWidth(table: TableShape): number {
  const header = textWidth(table.name, 'brand', TABLE_NAME_PX) + PAD_X * 2
  const rows = table.columns.map(
    (c) =>
      MARKER_W +
      textWidth(c.name, 'code', TABLE_ROW_PX) +
      NAME_TYPE_GAP +
      textWidth(c.type, 'code', TABLE_ROW_PX) +
      PAD_X * 2,
  )
  return Math.max(MIN_W, header, ...rows)
}

// Rows from INSERT switch a table to the grid until the teacher picks.
export function getTableView(table: TableShape): TableView {
  if (!table.rows?.length) return 'schema'
  return table.view ?? 'data'
}

export function getTableLayout(table: TableShape): TableLayout {
  const s = table.scale
  const headerH = HEADER_H * s
  const rowH = ROW_H * s
  const rows = table.columns.map((column, index) => {
    const top = table.y + headerH + index * rowH
    return { column, top, centreY: top + rowH / 2 }
  })
  return {
    x: table.x,
    y: table.y,
    w: contentWidth(table) * s,
    h: headerH + table.columns.length * rowH + BOTTOM_PAD * s,
    headerH,
    rowH,
    padX: PAD_X * s,
    markerW: MARKER_W * s,
    rows,
  }
}

// Where a foreign-key arrow meets the table: the row's left or right edge,
// whichever faces the other end. Null when the column is not on the table.
export function getColumnAnchor(
  table: TableShape,
  column: string,
  toward: Point,
  gap: number,
): Point | null {
  if (getTableView(table) === 'data') return null
  const layout = getTableLayout(table)
  const row = layout.rows.find(
    (r) => r.column.name.toLowerCase() === column.toLowerCase(),
  )
  if (!row) return null
  const facesLeft = toward.x < layout.x + layout.w / 2
  return {
    x: facesLeft ? layout.x - gap : layout.x + layout.w + gap,
    y: row.centreY,
  }
}
