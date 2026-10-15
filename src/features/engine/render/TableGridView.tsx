import { FONT_FAMILY } from '../model/boardSpec'
import { getTableGrid, type TableGrid } from '../model/tableGrid'
import { TABLE_ROW_PX } from '../model/tableLayout'
import type { TableShape } from '../model/types'
import { HighlightBand } from './HighlightBand'
import type { RowState } from '../model/highlights'
import { useBoardPalette } from './paletteContext'
import { QueryRows } from './QueryRows'
import {
  columnMarker,
  DIVIDER_OPACITY,
  MARKER_SHARE,
  MARKER_WEIGHT,
  MUTED_OPACITY,
} from './tableStyle'

type GridProps = { table: TableShape; ink: string; px: number; grid: TableGrid }

function GridLine({
  grid,
  y,
  ink,
  width,
}: Omit<GridProps, 'table' | 'px'> & {
  y: number
  width: number
}) {
  return (
    <line
      x1={grid.x}
      x2={grid.x + grid.w}
      y1={y}
      y2={y}
      stroke={ink}
      strokeOpacity={DIVIDER_OPACITY}
      strokeWidth={width}
    />
  )
}

function ColumnHeaders({ ink, px, grid }: Omit<GridProps, 'table'>) {
  const centreY = grid.columnsTop + grid.rowH / 2
  return grid.columns.map(({ column, x }) => {
    const marker = columnMarker(column)
    return (
      <text
        key={column.name}
        x={x + grid.padX}
        y={centreY}
        dominantBaseline="central"
        fill={ink}
        fontWeight={MARKER_WEIGHT}
        style={{ whiteSpace: 'pre' }}
      >
        {marker && <tspan fontSize={px * MARKER_SHARE}>{`${marker} `}</tspan>}
        {column.name}
      </text>
    )
  })
}

// Highlight steps light whole columns, from the column names to the bottom.
function ColumnBands({
  grid,
  highlighted,
  color,
}: {
  grid: TableGrid
  highlighted?: ReadonlySet<string>
  color: string
}) {
  const top = grid.columnsTop
  return grid.columns
    .filter(({ column }) => highlighted?.has(column.name.toLowerCase()))
    .map(({ column, x, w }) => (
      <HighlightBand
        key={column.name}
        x={x}
        y={top}
        w={w}
        h={grid.y + grid.h - top}
        color={color}
      />
    ))
}

// Column names across, up to eight sample rows down, then "+N more".
export function TableGridBody({
  table,
  highlighted,
  rowStates,
}: {
  table: TableShape
  highlighted?: ReadonlySet<string>
  rowStates?: RowState[]
}) {
  const palette = useBoardPalette()
  const ink = palette.ink[table.color]
  const grid = getTableGrid(table)
  const px = TABLE_ROW_PX * table.scale
  return (
    <g fontFamily={FONT_FAMILY.code} fontSize={px}>
      <ColumnBands
        grid={grid}
        highlighted={highlighted}
        color={palette.highlight[table.color]}
      />
      <GridLine grid={grid} ink={ink} y={grid.columnsTop} width={table.scale} />
      <ColumnHeaders ink={ink} px={px} grid={grid} />
      <GridLine
        grid={grid}
        ink={ink}
        y={grid.columnsTop + grid.rowH}
        width={table.scale * 2}
      />
      <QueryRows
        grid={grid}
        ink={ink}
        palette={palette}
        rowStates={rowStates}
      />
      {grid.hidden > 0 && (
        <text
          x={grid.x + grid.padX}
          y={grid.columnsTop + grid.rowH * (grid.rows.length + 1.5)}
          dominantBaseline="central"
          fill={ink}
          fillOpacity={MUTED_OPACITY}
        >
          {`+${grid.hidden} more`}
        </text>
      )}
    </g>
  )
}
