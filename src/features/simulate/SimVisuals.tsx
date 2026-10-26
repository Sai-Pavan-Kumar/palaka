import { FONT_FAMILY } from '../engine/model/boardSpec'
import type { BoardPalette } from '../engine/model/paper'
import type { ColorKey } from '../engine/model/types'
import { loadOf, meterText } from './meterText'
import { pointOnEdge } from './pathGeometry'
import type { SimEngine } from './simEngine'
import type { PacketMode, SimNode } from './simTypes'

const PACKET_R = 9
const TAG_RISE = 40
const METER_FONT = 17
const METER_GAP = 14
const BAR_H = 5
// Monospace glyphs are ~0.6em wide; enough to size a pill around the text.
const MONO_EM = 0.6

// Blue asks, green answers, red fails, orange is a cache miss, violet is
// async work nobody waits for. Same meaning everywhere on the board.
const MODE_COLOR: Record<PacketMode, ColorKey> = {
  request: 'blue',
  ok: 'green',
  miss: 'orange',
  error: 'red',
  async: 'violet',
}

function loadColor(load: number): ColorKey {
  if (load >= 1) return 'red'
  if (load >= 0.75) return 'orange'
  return 'green'
}

export function Packets({
  engine,
  palette,
}: {
  engine: SimEngine
  palette: BoardPalette
}) {
  return engine.packets.map((packet) => {
    const { hop } = packet
    if (!hop) return null
    const reverse = packet.returning ? !hop.reverse : hop.reverse
    const { x, y } = pointOnEdge(hop.edge, packet.distance, reverse)
    return (
      <circle
        key={packet.id}
        className="sim-packet"
        r={PACKET_R}
        style={{ transform: `translate(${x}px, ${y}px)` }}
        fill={palette.ink[MODE_COLOR[packet.mode]]}
        stroke={palette.paper}
        strokeWidth={2.5}
      />
    )
  })
}

export function Tags({
  engine,
  palette,
}: {
  engine: SimEngine
  palette: BoardPalette
}) {
  return engine.tags.map((tag, index) => {
    const t = tag.age / 1.1
    return (
      <text
        key={index}
        x={tag.x}
        y={tag.y - 12 - t * TAG_RISE}
        opacity={1 - t * t}
        textAnchor="middle"
        fontFamily={FONT_FAMILY.code}
        fontSize={22}
        fontWeight={700}
        fill={palette.ink[MODE_COLOR[tag.mode]]}
        stroke={palette.paper}
        strokeWidth={5}
        paintOrder="stroke"
      >
        {tag.text}
      </text>
    )
  })
}

type Box = SimNode['box']

// Bar under the block for how full it is; a breathing ring once it is
// close to the limit.
function LoadMarks({
  box,
  load,
  palette,
}: {
  box: Box
  load: number
  palette: BoardPalette
}) {
  const { x, y, w, h } = box
  const color = palette.ink[loadColor(load)]
  return (
    <>
      {load >= 0.75 && (
        <rect
          className="sim-glow"
          x={x - 6}
          y={y - 6}
          width={w + 12}
          height={h + 12}
          rx={14}
          fill="none"
          stroke={color}
          strokeWidth={4}
        />
      )}
      <rect
        x={x}
        y={y + h + 4}
        width={w * Math.min(1, load)}
        height={BAR_H}
        rx={BAR_H / 2}
        fill={color}
      />
    </>
  )
}

function MeterPill({
  box,
  text,
  palette,
}: {
  box: Box
  text: string
  palette: BoardPalette
}) {
  const { x, y, w, h } = box
  const top = y + h + METER_GAP
  const width = text.length * METER_FONT * MONO_EM + 20
  const height = METER_FONT + 12
  return (
    <g>
      <rect
        x={x + w / 2 - width / 2}
        y={top}
        width={width}
        height={height}
        rx={height / 2}
        fill={palette.paper}
        stroke={palette.ink.black}
        strokeOpacity={0.15}
      />
      <text
        x={x + w / 2}
        y={top + METER_FONT + 2}
        textAnchor="middle"
        fontFamily={FONT_FAMILY.code}
        fontSize={METER_FONT}
        fill={palette.ink.black}
      >
        {text}
      </text>
    </g>
  )
}

export function Meters({
  engine,
  palette,
}: {
  engine: SimEngine
  palette: BoardPalette
}) {
  return [...engine.graph.nodes.values()].map((node) => {
    const state = engine.states.get(node.id)
    if (!state) return null
    const text = meterText(node, state)
    const load = loadOf(node, state)
    return (
      <g key={node.id}>
        {load !== null && (
          <LoadMarks box={node.box} load={load} palette={palette} />
        )}
        {text && <MeterPill box={node.box} text={text} palette={palette} />}
      </g>
    )
  })
}
