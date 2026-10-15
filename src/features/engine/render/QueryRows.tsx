import type { CSSProperties } from 'react'
import { HIGHLIGHT_OPACITY } from '../model/boardSpec'
import type { RowState } from '../model/highlights'
import type { BoardPalette } from '../model/paper'
import { MAX_GRID_ROWS, NULL_TEXT, type TableGrid } from '../model/tableGrid'
import type { ColorKey } from '../model/types'
import { MUTED_OPACITY } from './tableStyle'

// A row dropped by WHERE / LIMIT stays faintly visible and struck through,
// so the viewer sees what was removed, not just that rows vanished.
const DROPPED_OPACITY = 0.28
// Group colours cycle through the highlighter tones in this order.
const GROUP_COLORS: ColorKey[] = [
  'blue',
  'green',
  'orange',
  'violet',
  'red',
  'black',
]

type QueryRowsProps = {
  grid: TableGrid
  ink: string
  palette: BoardPalette
  // Missing = no query clause is showing; rows sit as inserted.
  rowStates?: RowState[]
}

function rowStyle(state: RowState | undefined, index: number, rowH: number) {
  const pos = state?.pos ?? index
  return {
    transform: `translateY(${(pos - index) * rowH}px)`,
    opacity: pos >= MAX_GRID_ROWS ? 0 : state?.dim ? DROPPED_OPACITY : 1,
  } as CSSProperties
}

function RowTextCells({
  columns,
  padX,
  centreY,
  displayValues,
  ink,
  hasError,
}: {
  columns: TableGrid['columns']
  padX: number
  centreY: number
  displayValues: (string | null)[]
  ink: string
  hasError?: boolean
}) {
  return columns.map(({ column, x }, colIdx) => {
    const val = displayValues[colIdx]
    return (
      <text
        key={column.name}
        x={x + padX}
        y={centreY}
        dominantBaseline="central"
        fill={hasError ? '#D92D20' : ink}
        fillOpacity={val === null ? MUTED_OPACITY : undefined}
        style={{ whiteSpace: 'pre' }}
      >
        {val ?? NULL_TEXT}
      </text>
    )
  })
}

type RowItemProps = {
  grid: TableGrid
  ink: string
  palette: BoardPalette
  values: (string | null)[]
  top: number
  centreY: number
  state: RowState | undefined
  index: number
}

function StrikeLine({
  x1,
  x2,
  y,
  ink,
}: {
  x1: number
  x2: number
  y: number
  ink: string
}) {
  return <line x1={x1} x2={x2} y1={y} y2={y} stroke={ink} strokeWidth={2} />
}

function RowHighlight({
  x,
  y,
  w,
  h,
  group,
  palette,
}: {
  x: number
  y: number
  w: number
  h: number
  group: number | null
  palette: BoardPalette
}) {
  if (group === null) return null
  return (
    <rect
      x={x}
      y={y}
      width={w}
      height={h}
      fill={palette.highlight[GROUP_COLORS[group % GROUP_COLORS.length]]}
      fillOpacity={HIGHLIGHT_OPACITY}
    />
  )
}

function RowErrorBadge({
  x,
  y,
  error,
  color,
}: {
  x: number
  y: number
  error?: string
  color: string
}) {
  if (!error) return null
  return (
    <text x={x} y={y} dominantBaseline="central" fill={color} fontWeight={600}>
      {`⚠️ ${error}`}
    </text>
  )
}

function QueryRowItem({
  grid,
  ink,
  palette,
  values,
  top,
  centreY,
  state,
  index,
}: RowItemProps) {
  const displayValues = state?.values ?? values
  return (
    <g
      className={`query-row ${state?.isNew ? 'query-row-new' : ''}`}
      style={rowStyle(state, index, grid.rowH)}
    >
      <RowHighlight
        x={grid.x}
        y={top}
        w={grid.w}
        h={grid.rowH}
        group={state?.group ?? null}
        palette={palette}
      />
      <RowTextCells
        columns={grid.columns}
        padX={grid.padX}
        centreY={centreY}
        displayValues={displayValues}
        ink={ink}
        hasError={!!state?.error}
      />
      <RowErrorBadge
        x={grid.x + grid.w + grid.padX}
        y={centreY}
        error={state?.error}
        color={palette.ink['red']}
      />
      {state?.dim && (
        <StrikeLine
          x1={grid.x + grid.padX / 2}
          x2={grid.x + grid.w - grid.padX / 2}
          y={centreY}
          ink={ink}
        />
      )}
    </g>
  )
}

// The sample rows of a data grid. Each row is one group so a query clause
// can fade it, colour it by group, or slide it to its sorted place. Also
// renders cell updates, deleted rows, and new rows from mutation statements.
export function QueryRows({ grid, ink, palette, rowStates }: QueryRowsProps) {
  const base = grid.rows.map((row, rowIndex) => (
    <QueryRowItem
      key={rowIndex}
      grid={grid}
      ink={ink}
      palette={palette}
      values={row.values}
      top={row.top}
      centreY={row.centreY}
      state={rowStates?.[rowIndex]}
      index={rowIndex}
    />
  ))
  const extra = (rowStates?.slice(grid.rows.length) ?? []).map((state, i) => {
    const idx = grid.rows.length + i
    const top = grid.columnsTop + grid.rowH * (idx + 1)
    return (
      <QueryRowItem
        key={`extra-${idx}`}
        grid={grid}
        ink={ink}
        palette={palette}
        values={state.values ?? []}
        top={top}
        centreY={top + grid.rowH / 2}
        state={state}
        index={idx}
      />
    )
  })
  return [...base, ...extra]
}
