import { FONT_FAMILY } from '../model/boardSpec'
import { PAPER_COLORS, type BoardPalette } from '../model/paper'
import type { Paper } from '../model/types'
import { GRAIN_TILE, getGrainTile } from './grainTile'

// One cell is 1/40 of a 1920-wide slide: big enough to stay calm in a
// compressed video, small enough to line up handwriting.
const CELL = 48
// Blueprint paper draws every fifth line bolder, like real engineering paper.
const BLUEPRINT_MAJOR_EVERY = 5
const DOT_RADIUS = 2.5
const LINE_WIDTH = 1.5
const MAJOR_LINE_WIDTH = 2.5

// Brand mark: inset from the corner like a broadcast "bug".
const BRAND_INSET = 48
const BRAND_FONT_PX = 30
const BRAND_WEIGHT = 650
const BRAND_TEXT = 'The SurfBoard'

function GridLines({
  size,
  color,
  width,
}: {
  size: number
  color: string
  width: number
}) {
  return (
    <path
      // Half a line in from the tile edge, so the edge never clips it thin.
      d={`M${size} ${width / 2} H${width / 2} V${size}`}
      fill="none"
      stroke={color}
      strokeWidth={width}
    />
  )
}

function PatternTile({
  paper,
  palette,
}: {
  paper: Paper
  palette: BoardPalette
}) {
  const line = palette.patternLine
  switch (paper.pattern) {
    case 'dots':
      return (
        <circle
          cx={CELL / 2}
          cy={CELL / 2}
          r={DOT_RADIUS}
          fill={palette.patternMajor}
        />
      )
    case 'grid':
      return <GridLines size={CELL} color={line} width={LINE_WIDTH} />
    case 'grain':
      return (
        <image
          href={getGrainTile(palette.tone)}
          width={GRAIN_TILE}
          height={GRAIN_TILE}
        />
      )
    case 'blueprint':
      return (
        <>
          {Array.from({ length: BLUEPRINT_MAJOR_EVERY }, (_, i) => (
            <path
              key={i}
              d={`M${i * CELL + LINE_WIDTH / 2} 0 V${CELL * BLUEPRINT_MAJOR_EVERY} M0 ${i * CELL + LINE_WIDTH / 2} H${CELL * BLUEPRINT_MAJOR_EVERY}`}
              stroke={line}
              strokeWidth={LINE_WIDTH}
            />
          ))}
          <GridLines
            size={CELL * BLUEPRINT_MAJOR_EVERY}
            color={palette.patternMajor}
            width={MAJOR_LINE_WIDTH}
          />
        </>
      )
    case 'plain':
      return null
  }
}

// The paper sits under every shape. It is part of the board SVG, so it is in
// the video and in every export.
export function PaperBackground({
  paper,
  palette,
  width,
  height,
  patternId = 'paper-pattern',
}: {
  paper: Paper
  palette: BoardPalette
  width: number
  height: number
  // SVG ids are page-wide: the menu previews need their own.
  patternId?: string
}) {
  const tileSize =
    paper.pattern === 'blueprint'
      ? CELL * BLUEPRINT_MAJOR_EVERY
      : paper.pattern === 'grain'
        ? GRAIN_TILE
        : CELL
  return (
    <>
      <rect
        width={width}
        height={height}
        fill={PAPER_COLORS[paper.color].fill}
      />
      {paper.pattern !== 'plain' && (
        <>
          <defs>
            <pattern
              id={patternId}
              patternUnits="userSpaceOnUse"
              width={tileSize}
              height={tileSize}
            >
              <PatternTile paper={paper} palette={palette} />
            </pattern>
          </defs>
          <rect width={width} height={height} fill={`url(#${patternId})`} />
        </>
      )}
    </>
  )
}

// Drawn after the shapes, so content can never hide the brand in a video.
export function BrandMark({ palette }: { palette: BoardPalette }) {
  return (
    <text
      x={BRAND_INSET}
      y={BRAND_INSET + BRAND_FONT_PX * 0.8}
      fill={palette.brand}
      fontFamily={FONT_FAMILY.brand}
      fontWeight={BRAND_WEIGHT}
      fontSize={BRAND_FONT_PX}
      letterSpacing={-0.3}
      pointerEvents="none"
    >
      {BRAND_TEXT}
    </text>
  )
}
