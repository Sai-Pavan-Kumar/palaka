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

// The sample rows of a data grid. Each row is one group so a query clause
// can fade it, colour it by group, or slide it to its sorted place. Only
// transform and opacity change, so it stays smooth and seek-safe on video.
export function QueryRows({ grid, ink, palette, rowStates }: QueryRowsProps) {
  return grid.rows.map((row, rowIndex) => {
    const state = rowStates?.[rowIndex]
    const group = state?.group ?? null
    return (
      <g
        key={rowIndex}
        className="query-row"
        style={rowStyle(state, rowIndex, grid.rowH)}
      >
        {group !== null && (
          <rect
            x={grid.x}
            y={row.top}
            width={grid.w}
            height={grid.rowH}
            fill={palette.highlight[GROUP_COLORS[group % GROUP_COLORS.length]]}
            fillOpacity={HIGHLIGHT_OPACITY}
          />
        )}
        {grid.columns.map(({ column, x }, index) => {
          const value = row.values[index]
          return (
            <text
              key={column.name}
              x={x + grid.padX}
              y={row.centreY}
              dominantBaseline="central"
              fill={ink}
              fillOpacity={value === null ? MUTED_OPACITY : undefined}
              style={{ whiteSpace: 'pre' }}
            >
              {value ?? NULL_TEXT}
            </text>
          )
        })}
        {state?.dim && (
          <line
            x1={grid.x + grid.padX / 2}
            x2={grid.x + grid.w - grid.padX / 2}
            y1={row.centreY}
            y2={row.centreY}
            stroke={ink}
            strokeWidth={2}
          />
        )}
      </g>
    )
  })
}
