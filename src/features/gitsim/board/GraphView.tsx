import { FONT_FAMILY, FONT_WEIGHT } from '../../engine/model/boardSpec'
import type { BoardPalette } from '../../engine/model/paper'
import { clip } from './fitText'
import { laneColor } from './laneColor'
import type { GraphLayout, LabelSpot, NodeSpot } from '../layout/graphLayout'

const NODE_R = 22
// Gaegu at 26px runs about 12px a character; keep a gap between columns.
const CHAR_W = 14
const MESSAGE_MAX = 16
// Below this a message would be a stub; the id alone says more.
const MESSAGE_MIN = 4
const ID_MIN_STEP = 80
const LABEL_CHAR_W = 12.5
const LANE_TITLE_MAX = 14

function shorten(text: string, stepX: number): string {
  const max = Math.min(MESSAGE_MAX, Math.floor((stepX - 20) / CHAR_W))
  return max < MESSAGE_MIN ? '' : clip(text, max)
}

// Long names (feature/login-page-v2) still read; only the tail is cut.
function labelChars(stepX: number): number {
  return Math.min(18, Math.max(8, Math.floor((stepX + 20) / LABEL_CHAR_W)))
}

// Position lives on the outer group (it slides), the pop on the inner one
// (it plays once when the commit is born).
function Node({
  node,
  color,
  palette,
  stepX,
}: {
  node: NodeSpot
  stepX: number
  color: string
  palette: BoardPalette
}) {
  return (
    <g
      className={`gitsim-move ${node.isOrphan ? 'is-orphan' : ''}`}
      style={{ transform: `translate(${node.x}px, ${node.y}px)` }}
    >
      <g className="gitsim-pop">
        <circle
          r={NODE_R}
          fill={node.isHead ? color : palette.paper}
          stroke={color}
          strokeWidth={5}
          strokeDasharray={node.isOrphan ? '6 6' : undefined}
        />
        <text
          y={NODE_R + 30}
          textAnchor="middle"
          fill={palette.ink.black}
          fontFamily={FONT_FAMILY.code}
          fontSize={17}
          opacity={0.6}
        >
          {stepX >= ID_MIN_STEP ? node.id.slice(0, 7) : ''}
        </text>
        <text
          y={NODE_R + 60}
          textAnchor="middle"
          fill={palette.ink.black}
          fontFamily={FONT_FAMILY.brand}
          fontWeight={FONT_WEIGHT.brand}
          fontSize={26}
        >
          {shorten(node.message, stepX)}
        </text>
      </g>
    </g>
  )
}

// Tags and origin/ labels are outlined: they mark a spot, you never
// commit onto them.
function labelColors(label: LabelSpot, color: string, palette: BoardPalette) {
  const outlined = label.kind !== 'branch' && label.kind !== 'head'
  if (label.kind === 'head') {
    return { fill: palette.ink.black, ink: palette.onSolid, outlined }
  }
  if (!outlined) return { fill: color, ink: palette.onSolid, outlined }
  const ink = label.kind === 'tracking' ? color : palette.ink.black
  return { fill: palette.paper, ink, outlined }
}

function Label({
  label,
  maxChars,
  color,
  palette,
}: {
  label: LabelSpot
  maxChars: number
  color: string
  palette: BoardPalette
}) {
  const text = clip(label.text, maxChars)
  const width = text.length * LABEL_CHAR_W + 28
  const { fill, ink, outlined } = labelColors(label, color, palette)
  return (
    <g
      className="gitsim-move"
      style={{ transform: `translate(${label.x}px, ${label.y}px)` }}
    >
      <g className="gitsim-pop">
        <rect
          x={-width / 2}
          y={-17}
          width={width}
          height={34}
          rx={label.kind === 'tag' ? 4 : 17}
          fill={fill}
          stroke={
            label.kind === 'tag' ? palette.ink.black : outlined ? color : 'none'
          }
          strokeWidth={2}
          strokeDasharray={label.kind === 'tracking' ? '6 4' : undefined}
        />
        <text
          y={6}
          textAnchor="middle"
          fill={ink}
          fontFamily={FONT_FAMILY.code}
          fontSize={19}
          fontWeight={label.isCurrent ? 700 : 400}
        >
          {text}
        </text>
      </g>
    </g>
  )
}

function LaneNames({
  layout,
  palette,
}: {
  layout: GraphLayout
  palette: BoardPalette
}) {
  return layout.lanes.map((lane) => (
    <text
      key={lane.key}
      className="gitsim-move"
      style={{ transform: `translate(64px, ${lane.y + 7}px)` }}
      fill={laneColor(palette, lane.index, lane.name)}
      fontFamily={FONT_FAMILY.code}
      fontSize={20}
    >
      {clip(lane.title, LANE_TITLE_MAX)}
    </text>
  ))
}

export function GraphView({
  layout,
  palette,
}: {
  layout: GraphLayout
  palette: BoardPalette
}) {
  const colorOf = (index: number) =>
    laneColor(palette, index, layout.lanes[index]?.name ?? '')
  return (
    <g>
      <LaneNames layout={layout} palette={palette} />
      {layout.edges.map((edge) => (
        <path
          key={edge.key}
          className="gitsim-edge"
          d={edge.path}
          pathLength={1}
          fill="none"
          stroke={colorOf(edge.laneIndex)}
          strokeWidth={5}
          strokeLinecap="round"
          opacity={edge.isOrphan ? 0.35 : 1}
        />
      ))}
      {layout.nodes.map((node) => (
        <Node
          key={node.key}
          node={node}
          stepX={layout.stepX}
          color={colorOf(node.laneIndex)}
          palette={palette}
        />
      ))}
      {layout.labels.map((label) => (
        <Label
          key={label.key}
          label={label}
          maxChars={labelChars(layout.stepX)}
          color={colorOf(label.laneIndex)}
          palette={palette}
        />
      ))}
    </g>
  )
}
