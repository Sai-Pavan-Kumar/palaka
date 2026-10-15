import { useMemo } from 'react'
import {
  FONT_FAMILY,
  FONT_WEIGHT,
  getStrokeWidth,
  HIGHLIGHT_OPACITY,
  hatchPatternId,
} from '../model/boardSpec'
import {
  getOutline,
  outlineToSvgPath,
  type OutlinedShape,
} from '../model/geoOutline'
import { getLabelBaseline, getLineLabelLayout } from '../model/labelLayout'
import type { BoardPalette } from '../model/paper'
import { measureText } from '../model/textMetrics'
import type { LineShape, Point } from '../model/types'
import { useBoardPalette } from './paletteContext'
import {
  getArrowheadWings,
  getDashArray,
  getRoughGeoPaths,
  getRoughLinePaths,
} from './shapePaths'

type Paint = { fill: string; opacity: number }

function getFillPaint(
  shape: OutlinedShape,
  palette: BoardPalette,
): Paint | null {
  switch (shape.fill) {
    case 'none':
      return null
    case 'tint':
      return palette.tint(shape.color)
    case 'solid':
      return { fill: palette.ink[shape.color], opacity: 1 }
    case 'hatch':
      return { fill: `url(#${hatchPatternId(shape.color)})`, opacity: 1 }
  }
}

function InkPaths({
  paths,
  color,
  width,
}: {
  paths: string[]
  color: string
  width: number
}) {
  return paths.map((d, index) => (
    <path
      key={index}
      d={d}
      fill="none"
      stroke={color}
      strokeWidth={width}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ))
}

// part lets the draw-on reveal trace the outline while the fill fades in.
export function GeoView({
  shape,
  part = 'all',
}: {
  shape: OutlinedShape
  part?: 'all' | 'fill' | 'outline'
}) {
  const palette = useBoardPalette()
  const width = getStrokeWidth(shape)
  const cleanPath = useMemo(() => outlineToSvgPath(getOutline(shape)), [shape])
  const roughPaths = useMemo(
    () => (shape.dash === 'hand' ? getRoughGeoPaths(shape, width) : []),
    [shape, width],
  )
  const fill = part !== 'outline' ? getFillPaint(shape, palette) : null
  const fillPath = fill && (
    <path d={cleanPath} fill={fill.fill} fillOpacity={fill.opacity} />
  )
  if (part === 'fill') return fillPath
  const ink = palette.ink[shape.color]
  return (
    <>
      {fillPath}
      {shape.dash === 'hand' ? (
        <InkPaths paths={roughPaths} color={ink} width={width} />
      ) : (
        <path
          d={cleanPath}
          fill="none"
          stroke={ink}
          strokeWidth={width}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={getDashArray(shape.dash, width)}
        />
      )}
    </>
  )
}

function getLineSegments(shape: LineShape, width: number): [Point, Point][] {
  const body: [Point, Point] = [
    { x: shape.x1, y: shape.y1 },
    { x: shape.x2, y: shape.y2 },
  ]
  if (!shape.arrowhead) return [body]
  const { tip, left, right } = getArrowheadWings(shape, width)
  return [body, [left, tip], [right, tip]]
}

// The arrowhead is always solid: a dotted head would read as noise.
export function LineView({ shape }: { shape: LineShape }) {
  const palette = useBoardPalette()
  const width = getStrokeWidth(shape)
  const segments = useMemo(() => getLineSegments(shape, width), [shape, width])
  const roughPaths = useMemo(
    () =>
      shape.dash === 'hand' ? getRoughLinePaths(shape, segments, width) : [],
    [shape, segments, width],
  )
  const ink = palette.ink[shape.color]
  if (shape.dash === 'hand') {
    return <InkPaths paths={roughPaths} color={ink} width={width} />
  }
  const [body, ...head] = segments
  const toPath = ([a, b]: [Point, Point]) => `M${a.x},${a.y} L${b.x},${b.y}`
  return (
    <>
      <path
        d={toPath(body)}
        fill="none"
        stroke={ink}
        strokeWidth={width}
        strokeLinecap="round"
        strokeDasharray={getDashArray(shape.dash, width)}
      />
      {head.length > 0 && (
        <InkPaths paths={head.map(toPath)} color={ink} width={width} />
      )}
    </>
  )
}

// Room around the label text inside its pill.
const LABEL_PAD_X = 12
const LABEL_PAD_Y = 4

// A paper-coloured pill at the middle of the line: the label interrupts the
// line instead of being crossed out by it.
export function LineLabel({ shape }: { shape: LineShape }) {
  const palette = useBoardPalette()
  if (!shape.label) return null
  const layout = getLineLabelLayout(shape)
  const { w, h } = measureText({
    id: '',
    type: 'text',
    x: 0,
    y: 0,
    text: shape.label,
    color: shape.color,
    opacity: 1,
    font: layout.font,
    size: layout.size,
    scale: layout.scale,
  })
  return (
    <>
      <rect
        x={layout.centreX - w / 2 - LABEL_PAD_X}
        y={layout.top - LABEL_PAD_Y}
        width={w + LABEL_PAD_X * 2}
        height={h + LABEL_PAD_Y * 2}
        rx={(h + LABEL_PAD_Y * 2) / 2}
        fill={palette.paper}
      />
      <text
        x={layout.centreX}
        y={getLabelBaseline(layout)}
        textAnchor="middle"
        fill={palette.ink[shape.color]}
        fontFamily={FONT_FAMILY[layout.font]}
        fontWeight={FONT_WEIGHT[layout.font]}
        fontSize={layout.fontPx}
        style={{ whiteSpace: 'pre' }}
      >
        {shape.label}
      </text>
    </>
  )
}

// Width of the marker glow around a highlighted connector, in line widths.
const GLOW_FACTOR = 5

// A highlighter stroke under a connector whose two columns are lit, so the
// eye follows the key from one table to the other.
export function LineGlow({ shape }: { shape: LineShape }) {
  const palette = useBoardPalette()
  return (
    <path
      className="table-highlight"
      d={`M${shape.x1},${shape.y1} L${shape.x2},${shape.y2}`}
      stroke={palette.highlight[shape.color]}
      strokeOpacity={HIGHLIGHT_OPACITY}
      strokeWidth={getStrokeWidth(shape) * GLOW_FACTOR}
      strokeLinecap="round"
      fill="none"
    />
  )
}
