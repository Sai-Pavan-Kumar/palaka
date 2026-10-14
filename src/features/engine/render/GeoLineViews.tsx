import { useMemo } from 'react'
import { getStrokeWidth, hatchPatternId } from '../model/boardSpec'
import { getGeoOutline, outlineToSvgPath } from '../model/geoOutline'
import type { BoardPalette } from '../model/paper'
import type { GeoShape, LineShape, Point } from '../model/types'
import { useBoardPalette } from './paletteContext'
import {
  getArrowheadWings,
  getDashArray,
  getRoughGeoPaths,
  getRoughLinePaths,
} from './shapePaths'

type Paint = { fill: string; opacity: number }

function getFillPaint(shape: GeoShape, palette: BoardPalette): Paint | null {
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
  shape: GeoShape
  part?: 'all' | 'fill' | 'outline'
}) {
  const palette = useBoardPalette()
  const width = getStrokeWidth(shape)
  const cleanPath = useMemo(
    () => outlineToSvgPath(getGeoOutline(shape)),
    [shape],
  )
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
