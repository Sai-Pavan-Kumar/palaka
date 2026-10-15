import { FONT_FAMILY, hatchPatternId } from '../model/boardSpec'
import { BLOCK_CORNER_RADIUS } from '../model/blockCatalog'
import type { BoardPalette } from '../model/paper'
import { getTableBox } from '../model/tableBox'
import {
  getTableLayout,
  getTableView,
  HEADER_H,
  PAD_X,
  TABLE_NAME_PX,
  TABLE_ROW_PX,
  type TableLayout,
} from '../model/tableLayout'
import type { RowState } from '../model/highlights'
import type { TableShape } from '../model/types'
import { GeoView } from './GeoLineViews'
import { HighlightBand } from './HighlightBand'
import { useBoardPalette } from './paletteContext'
import { TableGridBody } from './TableGridView'
import {
  columnMarker,
  DIVIDER_OPACITY,
  MARKER_SHARE,
  MARKER_WEIGHT,
  MUTED_OPACITY,
} from './tableStyle'

// Header weight per the design system: emphasis is weight, never italics.
const HEADER_WEIGHT = 600

type Box = { x: number; y: number; w: number; h: number }

function headerPaint(table: TableShape, palette: BoardPalette) {
  switch (table.fill) {
    case 'none':
      return null
    case 'tint':
      return palette.tint(table.color)
    case 'solid':
      return { fill: palette.ink[table.color], opacity: 1 }
    case 'hatch':
      return { fill: `url(#${hatchPatternId(table.color)})`, opacity: 1 }
  }
}

// The header band follows the table's rounded top corners.
function headerPath({ x, y, w }: Box, headerH: number): string {
  const r = Math.min(BLOCK_CORNER_RADIUS, w / 2, headerH)
  return `M${x},${y + headerH} V${y + r} Q${x},${y} ${x + r},${y} H${x + w - r} Q${x + w},${y} ${x + w},${y + r} V${y + headerH} Z`
}

type RowProps = {
  row: TableLayout['rows'][number]
  layout: TableLayout
  ink: string
  px: number
  scale: number
}

function TableRowView({ row, layout, ink, px, scale }: RowProps) {
  const { column, top, centreY } = row
  return (
    <g fontFamily={FONT_FAMILY.code} fontSize={px}>
      <line
        x1={layout.x}
        x2={layout.x + layout.w}
        y1={top}
        y2={top}
        stroke={ink}
        strokeOpacity={DIVIDER_OPACITY}
        strokeWidth={scale}
      />
      <text
        x={layout.x + layout.padX}
        y={centreY}
        dominantBaseline="central"
        fill={ink}
        fontSize={px * MARKER_SHARE}
        fontWeight={MARKER_WEIGHT}
      >
        {columnMarker(column)}
      </text>
      <text
        x={layout.x + layout.padX + layout.markerW}
        y={centreY}
        dominantBaseline="central"
        fill={ink}
        style={{ whiteSpace: 'pre' }}
      >
        {column.name}
      </text>
      <text
        x={layout.x + layout.w - layout.padX}
        y={centreY}
        dominantBaseline="central"
        textAnchor="end"
        fill={ink}
        fillOpacity={MUTED_OPACITY}
        style={{ whiteSpace: 'pre' }}
      >
        {column.type}
      </text>
    </g>
  )
}

function SchemaBody({
  table,
  highlighted,
}: {
  table: TableShape
  highlighted?: ReadonlySet<string>
}) {
  const palette = useBoardPalette()
  const layout = getTableLayout(table)
  const ink = palette.ink[table.color]
  const px = TABLE_ROW_PX * table.scale
  return layout.rows.map((row) => (
    <g key={row.column.name}>
      {highlighted?.has(row.column.name.toLowerCase()) && (
        <HighlightBand
          x={layout.x}
          y={row.top}
          w={layout.w}
          h={layout.rowH}
          color={palette.highlight[table.color]}
        />
      )}
      <TableRowView
        row={row}
        layout={layout}
        ink={ink}
        px={px}
        scale={table.scale}
      />
    </g>
  ))
}

type ContentsProps = {
  shape: TableShape
  // Lower-case column names lit by a highlight step that is showing.
  highlighted?: ReadonlySet<string>
  rowStates?: RowState[]
}

// Header band, name and body. Split from the outline so the draw-on reveal
// can trace the outline first and fade these in after.
export function TableContents({
  shape,
  highlighted,
  rowStates,
}: ContentsProps) {
  const palette = useBoardPalette()
  const box = getTableBox(shape)
  const headerH = HEADER_H * shape.scale
  const ink = palette.ink[shape.color]
  const paint = headerPaint(shape, palette)
  const headerInk = shape.fill === 'solid' ? palette.onSolid : ink
  const isData = getTableView(shape) === 'data'
  return (
    <>
      {paint && (
        <path
          d={headerPath(box, headerH)}
          fill={paint.fill}
          fillOpacity={paint.opacity}
        />
      )}
      <text
        x={box.x + PAD_X * shape.scale}
        y={box.y + headerH / 2}
        dominantBaseline="central"
        fill={headerInk}
        fontFamily={FONT_FAMILY.brand}
        fontWeight={HEADER_WEIGHT}
        fontSize={TABLE_NAME_PX * shape.scale}
        style={{ whiteSpace: 'pre' }}
      >
        {shape.name}
      </text>
      {isData ? (
        <TableGridBody
          table={shape}
          highlighted={highlighted}
          rowStates={rowStates}
        />
      ) : (
        <SchemaBody table={shape} highlighted={highlighted} />
      )}
    </>
  )
}

export function TableView(props: ContentsProps) {
  return (
    <>
      <TableContents {...props} />
      <GeoView shape={props.shape} part="outline" />
    </>
  )
}
