import { FONT_FAMILY, FONT_WEIGHT } from '../../engine/model/boardSpec'
import type { BoardPalette } from '../../engine/model/paper'
import type { GitState } from '../engine/types'
import {
  layoutGraph,
  localBand,
  remoteBand,
  type GraphArea,
  type GraphLayout,
} from '../layout/graphLayout'
import { GraphView } from './GraphView'

const TITLE_X = 64
// GitHub is one short row; the laptop needs room above it for up to
// three stacked labels (main, origin/main, HEAD).
const REMOTE_Y = 200
const BAND_GAP = 240
// A commit's id and message hang this far below its circle.
const NODE_TEXT_H = 95

type Band = { title?: string; titleY?: number; layout: GraphLayout }

function BandTitle({
  text,
  y,
  palette,
}: {
  text: string
  y: number
  palette: BoardPalette
}) {
  return (
    <text
      x={TITLE_X}
      y={y}
      fontFamily={FONT_FAMILY.brand}
      fontWeight={FONT_WEIGHT.brand}
      fontSize={30}
      fill={palette.ink.black}
      opacity={0.55}
    >
      {text}
    </text>
  )
}

function bandLayouts(state: GitState, area: GraphArea): Band[] {
  const remote = remoteBand(state)
  if (!remote) return [{ layout: layoutGraph(state, area) }]
  // GitHub on top, the laptop below: push sends commits up, pull brings
  // them down. Busy GitHub labels push its row down; the laptop follows.
  const remoteLayout = layoutGraph(
    state,
    { ...area, top: REMOTE_Y, bottom: REMOTE_Y + 60 },
    remote,
  )
  const remoteRow = Math.max(REMOTE_Y, ...remoteLayout.lanes.map((l) => l.y))
  const localTop = remoteRow + BAND_GAP
  const localArea = {
    ...area,
    top: localTop,
    bottom: Math.max(area.bottom, localTop),
  }
  return [
    { title: 'GitHub (origin)', titleY: REMOTE_Y - 80, layout: remoteLayout },
    {
      title: 'Your laptop',
      titleY: localTop - 110,
      layout: layoutGraph(state, localArea, localBand(state)),
    },
  ]
}

function contentBottom(bands: Band[]): number {
  const ys = bands.flatMap((band) => band.layout.lanes.map((lane) => lane.y))
  return Math.max(0, ...ys) + NODE_TEXT_H
}

// Many branches (or GitHub plus several laptop branches) can need more
// height than the board has above the file areas. Then the whole graph
// shrinks from its top-left corner instead of running into them.
export function GraphBands({
  state,
  area,
  limit,
  centred,
  palette,
}: {
  state: GitState
  area: GraphArea
  limit: number
  centred: boolean
  palette: BoardPalette
}) {
  const bands = bandLayouts(state, area)
  const top = 80
  const bottom = contentBottom(bands)
  const scale = bottom > limit ? (limit - top) / (bottom - top) : 1
  // A tall reel board leaves room to spare: centre the graph in it rather
  // than leave the middle of the video empty. Slides as the graph grows.
  const spare = centred ? Math.max(0, (limit - bottom) / 2) : 0
  const origin = `${TITLE_X}px ${top}px`
  return (
    <g
      className="gitsim-move"
      style={{
        transformOrigin: origin,
        transform: `translate(0px, ${spare}px) scale(${scale})`,
      }}
    >
      {bands.map((band, i) => (
        <g key={i}>
          {band.title && (
            <BandTitle text={band.title} y={band.titleY!} palette={palette} />
          )}
          <GraphView layout={band.layout} palette={palette} />
        </g>
      ))}
    </g>
  )
}
