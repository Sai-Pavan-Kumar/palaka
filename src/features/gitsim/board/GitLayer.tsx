import {
  SLIDE_SIZE,
  FONT_FAMILY,
  FONT_WEIGHT,
} from '../../engine/model/boardSpec'
import { getPalette, type BoardPalette } from '../../engine/model/paper'
import type { Aspect, Paper } from '../../engine/model/types'
import type { GitState } from '../engine/types'
import { useGitSimStore } from '../gitSimStore'
import type { GraphArea } from '../layout/graphLayout'
import { AreasView } from './AreasView'
import { GraphBands } from './GraphBands'
import { Terminal } from './Terminal'
import './gitsim.css'

const MARGIN = 120
const GRAPH_LEFT = MARGIN + 200
// Room above the first lane for stacked branch labels.
const LABEL_ROOM = 120

const OP_TEXT = {
  merge: 'MERGING',
  rebase: 'REBASING',
  'cherry-pick': 'CHERRY-PICKING',
}

function Placeholder({
  state,
  area,
  palette,
}: {
  state: GitState
  area: GraphArea
  palette: BoardPalette
}) {
  const empty = !state.order.some((id) => state.local[id])
  if (state.initialized && !empty) return null
  const text = state.initialized ? 'No commits yet' : 'Not a Git repository yet'
  return (
    <text
      key={text}
      className="gitsim-type"
      x={(area.left + area.right) / 2}
      y={(area.top + area.bottom) / 2}
      textAnchor="middle"
      fontFamily={FONT_FAMILY.brand}
      fontWeight={FONT_WEIGHT.brand}
      fontSize={44}
      fill={palette.ink.black}
      opacity={0.4}
    >
      {text}
    </text>
  )
}

function OpPill({
  state,
  x,
  y,
  palette,
}: {
  state: GitState
  x: number
  y: number
  palette: BoardPalette
}) {
  if (!state.op) return null
  const text = OP_TEXT[state.op.kind]
  const width = text.length * 15 + 40
  return (
    <g className="gitsim-type" transform={`translate(${x - width}, ${y})`}>
      <rect width={width} height={44} rx={22} fill={palette.ink.red} />
      <text
        x={width / 2}
        y={30}
        textAnchor="middle"
        fontFamily={FONT_FAMILY.code}
        fontSize={21}
        fontWeight={700}
        fill={palette.onSolid}
      >
        {text}
      </text>
    </g>
  )
}

// Inside the recorded board, beside SimLayer and CodeSimLayer: takes capture
// the graph, exports draw only the document.
export function GitLayer({ aspect, paper }: { aspect: Aspect; paper: Paper }) {
  const stepIndex = useGitSimStore((s) => s.index)
  const step = useGitSimStore((s) => s.steps[s.index])
  if (!step) return null
  const { width, height } = SLIDE_SIZE[aspect]
  const palette = getPalette(paper)
  // A reel (9:16) has spare height: the terminal shows more output.
  const terminalH = height > width ? 440 : 290
  const terminalTop = height - terminalH - 30
  const areasTop = terminalTop - 150
  const area = {
    left: GRAPH_LEFT,
    // The last message hangs half a column past its circle.
    right: width - MARGIN - 80,
    top: 100 + LABEL_ROOM,
    bottom: areasTop - 120,
  }
  return (
    <g className="gitsim-layer" pointerEvents="none">
      <Placeholder state={step.state} area={area} palette={palette} />
      <GraphBands
        state={step.state}
        area={area}
        limit={areasTop - 30}
        centred={height > width}
        palette={palette}
      />
      <OpPill
        state={step.state}
        x={width - MARGIN / 2}
        y={50}
        palette={palette}
      />
      <AreasView
        state={step.state}
        left={MARGIN / 2}
        right={width - MARGIN / 2}
        top={areasTop}
        palette={palette}
      />
      <Terminal
        step={step}
        stepIndex={stepIndex}
        top={terminalTop}
        width={width}
        height={terminalH}
        palette={palette}
      />
    </g>
  )
}
