import type { BoardPalette } from '../../engine/model/paper'
import type { ArrayGeometry } from './arrayModel'
import type {
  GraphEdge,
  GraphGeometry,
  GraphModel,
  NodeState,
} from './graphModel'
import { arrowHead } from './listGeometry'
import { codeFontCss } from './panelLayout'

type Look = { fill: string; fillOpacity: number; stroke: string; width: number }

function lookOf(state: NodeState, palette: BoardPalette): Look {
  const { ink, paper } = palette
  switch (state) {
    case 'current':
      return {
        fill: ink.orange,
        fillOpacity: 0.22,
        stroke: ink.orange,
        width: 5,
      }
    case 'queued':
      return { fill: paper, fillOpacity: 1, stroke: ink.blue, width: 5 }
    case 'visited':
      return { fill: ink.green, fillOpacity: 0.16, stroke: ink.green, width: 3 }
    default:
      return { fill: paper, fillOpacity: 1, stroke: ink.black, width: 2 }
  }
}

function EdgeLine({
  edge,
  g,
  palette,
}: {
  edge: GraphEdge
  g: GraphGeometry
  palette: BoardPalette
}) {
  const a = g.layout.spots.get(edge.a)!
  const b = g.layout.spots.get(edge.b)!
  const len = Math.hypot(b.x - a.x, b.y - a.y) || 1
  const [ux, uy] = [(b.x - a.x) / len, (b.y - a.y) / len]
  const [x1, y1] = [a.x + ux * g.r, a.y + uy * g.r]
  const [x2, y2] = [b.x - ux * g.r, b.y - uy * g.r]
  const color = edge.active ? palette.ink.orange : palette.ink.black
  return (
    <g>
      <line
        className="codesim-graph-edge"
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        style={{
          stroke: color,
          strokeOpacity: edge.active ? 1 : 0.4,
          strokeWidth: edge.active ? 5 : 2.5,
        }}
      />
      {edge.directed && (
        <path d={arrowHead(x2, y2, ux, uy, g.r * 0.35)} fill={color} />
      )}
    </g>
  )
}

function NodeDot({
  nodeKey,
  state,
  g,
  geo,
  palette,
}: {
  nodeKey: string
  state: NodeState
  g: GraphGeometry
  geo: ArrayGeometry
  palette: BoardPalette
}) {
  const spot = g.layout.spots.get(nodeKey)!
  const look = lookOf(state, palette)
  return (
    <g className="codesim-graph-node">
      <circle
        cx={spot.x}
        cy={spot.y}
        r={g.r}
        style={{
          fill: look.fill,
          fillOpacity: look.fillOpacity,
          stroke: look.stroke,
          strokeWidth: look.width,
        }}
      />
      <text
        x={spot.x}
        y={spot.y}
        textAnchor="middle"
        dominantBaseline="central"
        fill={palette.ink.black}
        style={{ font: codeFontCss(geo.fontPx) }}
      >
        {nodeKey}
      </text>
    </g>
  )
}

const LEGEND: [NodeState, string][] = [
  ['current', 'current'],
  ['queued', 'in queue'],
  ['visited', 'visited'],
]

function Legend({
  y,
  geo,
  palette,
}: {
  y: number
  geo: ArrayGeometry
  palette: BoardPalette
}) {
  const size = geo.fontPx * 0.45
  const pitch = geo.fontPx * 6
  return LEGEND.map(([state, label], i) => {
    const look = lookOf(state, palette)
    return (
      <g key={state} transform={`translate(${i * pitch} ${y})`}>
        <circle
          cx={size}
          r={size}
          fill={look.fill}
          fillOpacity={look.fillOpacity}
          stroke={look.stroke}
          strokeWidth={3}
        />
        <text
          x={size * 2.8}
          dominantBaseline="central"
          fill={palette.ink.black}
          fillOpacity={0.6}
          style={{ font: codeFontCss(geo.fontPx * 0.7) }}
        >
          {label}
        </text>
      </g>
    )
  })
}

function GraphBody({
  model,
  g,
  geo,
  palette,
}: {
  model: GraphModel
  g: GraphGeometry
  geo: ArrayGeometry
  palette: BoardPalette
}) {
  return (
    <>
      {model.edges.map((edge) => (
        <EdgeLine
          key={`${edge.a}-${edge.b}`}
          edge={edge}
          g={g}
          palette={palette}
        />
      ))}
      {model.nodes.map((node) => (
        <NodeDot
          key={node.key}
          nodeKey={node.key}
          state={node.state}
          g={g}
          geo={geo}
          palette={palette}
        />
      ))}
    </>
  )
}

export function GraphView({
  model,
  g,
  x,
  y,
  geo,
  palette,
}: {
  model: GraphModel
  g: GraphGeometry
  x: number
  y: number
  geo: ArrayGeometry
  palette: BoardPalette
}) {
  const body = g.labelH + g.r
  return (
    <g transform={`translate(${x} ${y})`}>
      <text
        y={geo.fontPx * 0.6}
        dominantBaseline="central"
        fill={palette.ink.black}
        fillOpacity={0.5}
        style={{ font: codeFontCss(geo.fontPx * 0.85) }}
      >
        {model.name}
      </text>
      <g transform={`translate(${g.r} ${body})`}>
        <GraphBody model={model} g={g} geo={geo} palette={palette} />
      </g>
      <Legend
        y={body + g.layout.height + g.r + g.legendH * 0.6}
        geo={geo}
        palette={palette}
      />
    </g>
  )
}
