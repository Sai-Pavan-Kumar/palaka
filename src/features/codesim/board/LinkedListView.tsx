import type { BoardPalette } from '../../engine/model/paper'
import type { ColorKey } from '../../engine/model/types'
import type { ArrayGeometry } from './arrayModel'
import {
  labelRows,
  type LinkedModel,
  type ListLabel,
  type ListLink,
} from './linkedModel'
import {
  arrowHead,
  linkPath,
  listGeometry,
  noneMarks,
  slotX,
  type ListGeometry,
} from './listGeometry'
import { codeFontCss } from './panelLayout'

const LABEL_COLORS: ColorKey[] = ['blue', 'green', 'orange', 'violet', 'red']

function LinkArrow({
  model,
  g,
  link,
  palette,
}: {
  model: LinkedModel
  g: ListGeometry
  link: ListLink
  palette: BoardPalette
}) {
  const { d, end } = linkPath(model, g, link)
  const [x, y, dx, dy] = end
  const color = palette.ink.black
  return (
    // Keyed by from→to: a re-pointed "next" mounts fresh and draws itself.
    <g className="codesim-link">
      <path
        d={d}
        pathLength={1}
        fill="none"
        stroke={color}
        strokeWidth={3}
        strokeLinecap="round"
      />
      <path d={arrowHead(x, y, dx, dy, g.geo.fontPx * 0.45)} fill={color} />
    </g>
  )
}

function NodeLabel({
  label,
  row,
  color,
  model,
  g,
}: {
  label: ListLabel
  row: number
  color: string
  model: LinkedModel
  g: ListGeometry
}) {
  const x = slotX(model, g, label.id) + g.w / 2
  const y = g.top - row * g.geo.tagH - g.geo.fontPx * 0.25
  const tip = g.geo.fontPx * 0.3
  return (
    <g
      className="codesim-pointer"
      style={{ transform: `translate(${x}px, ${y}px)` }}
    >
      <path
        d={`M0 0 L${tip} ${-tip * 1.3} L${-tip} ${-tip * 1.3} Z`}
        fill={color}
      />
      <text
        y={-tip * 1.3 - g.geo.fontPx * 0.3}
        textAnchor="middle"
        fill={color}
        style={{ font: codeFontCss(g.geo.fontPx * 0.8), fontWeight: 600 }}
      >
        {label.name}
      </text>
    </g>
  )
}

function NodeBoxes({
  model,
  g,
  palette,
}: {
  model: LinkedModel
  g: ListGeometry
  palette: BoardPalette
}) {
  return model.nodes.map((node, index) => (
    <g key={node.id}>
      <rect
        x={index * g.pitch}
        y={g.top}
        width={g.w}
        height={g.h}
        rx={g.h * 0.22}
        fill={palette.paper}
        stroke={palette.ink.black}
        strokeOpacity={0.55}
        strokeWidth={2}
      />
      <text
        x={index * g.pitch + g.w / 2}
        y={g.top + g.h / 2}
        textAnchor="middle"
        dominantBaseline="central"
        fill={palette.ink.black}
        style={{ font: codeFontCss(g.geo.fontPx) }}
      >
        {node.text}
      </text>
    </g>
  ))
}

function NoneMarks({
  model,
  g,
  palette,
}: {
  model: LinkedModel
  g: ListGeometry
  palette: BoardPalette
}) {
  const marks = noneMarks(model, g)
  return marks.map((mark) => (
    <text
      key={mark.key}
      x={mark.x}
      y={mark.y}
      textAnchor={mark.anchor}
      dominantBaseline="central"
      fill={palette.ink.black}
      fillOpacity={0.5}
      style={{ font: codeFontCss(g.geo.fontPx * 0.8) }}
    >
      None
    </text>
  ))
}

export function LinkedListView({
  model,
  x,
  y,
  geo,
  palette,
}: {
  model: LinkedModel
  x: number
  y: number
  geo: ArrayGeometry
  palette: BoardPalette
}) {
  const g = listGeometry(model, geo)
  const rows = labelRows(model.labels)
  return (
    <g transform={`translate(${x} ${y})`}>
      {model.links.map((link) => (
        <LinkArrow
          key={`${link.from}-${link.to}`}
          model={model}
          g={g}
          link={link}
          palette={palette}
        />
      ))}
      <NodeBoxes model={model} g={g} palette={palette} />
      <NoneMarks model={model} g={g} palette={palette} />
      {model.labels.map((label, order) => (
        <NodeLabel
          key={label.name}
          label={label}
          row={rows.get(label.name) ?? 0}
          color={palette.ink[LABEL_COLORS[order % LABEL_COLORS.length]]}
          model={model}
          g={g}
        />
      ))}
    </g>
  )
}
