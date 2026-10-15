import type { CSSProperties } from 'react'
import { getStrokeWidth } from '../model/boardSpec'
import type { LineShape } from '../model/types'
import { useBoardPalette } from './paletteContext'

// Sizes follow the line width, so a thick arrow carries bigger packets.
const DOT_FACTOR = 2.2
const GAP_FACTOR = 6
// Slide pixels per second: calm enough to follow while the teacher talks.
const FLOW_SPEED = 220
// Two-way flow runs two lanes side by side so the dots never collide.
const LANE_OFFSET_FACTOR = 0.9

type Lane = { dx: number; dy: number; reverse: boolean }

function getLanes(line: LineShape, dot: number): Lane[] {
  const direction = line.flow?.direction ?? 'forward'
  if (direction !== 'both') {
    return [{ dx: 0, dy: 0, reverse: direction === 'backward' }]
  }
  const length = Math.hypot(line.x2 - line.x1, line.y2 - line.y1) || 1
  const nx = (-(line.y2 - line.y1) / length) * dot * LANE_OFFSET_FACTOR
  const ny = ((line.x2 - line.x1) / length) * dot * LANE_OFFSET_FACTOR
  return [
    { dx: nx, dy: ny, reverse: false },
    { dx: -nx, dy: -ny, reverse: true },
  ]
}

// Round-capped zero-length dashes are dots; sliding the dash offset by one
// period moves every dot one gap along, so the loop is seamless. Pure CSS:
// no timers, so a recording never stutters and a paused tab costs nothing.
export function FlowDots({
  shape,
  isRunning,
}: {
  shape: LineShape
  isRunning: boolean
}) {
  const palette = useBoardPalette()
  const dot = getStrokeWidth(shape) * DOT_FACTOR
  const period = dot * GAP_FACTOR
  return getLanes(shape, dot).map((lane, index) => {
    const from = { x: shape.x1 + lane.dx, y: shape.y1 + lane.dy }
    const to = { x: shape.x2 + lane.dx, y: shape.y2 + lane.dy }
    const [a, b] = lane.reverse ? [to, from] : [from, to]
    const timing = {
      '--flow-shift': `${-period}`,
      '--flow-period': `${period / FLOW_SPEED}s`,
    } as CSSProperties
    return (
      <path
        key={index}
        className={`flow-dots ${isRunning ? 'is-running' : ''}`}
        style={timing}
        d={`M${a.x},${a.y} L${b.x},${b.y}`}
        fill="none"
        stroke={palette.ink[shape.color]}
        strokeWidth={dot}
        strokeLinecap="round"
        strokeDasharray={`0 ${period}`}
      />
    )
  })
}
