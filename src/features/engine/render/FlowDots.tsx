import type { CSSProperties } from 'react'
import { getStrokeWidth } from '../model/boardSpec'
import { getLinePath } from '../model/lineRouting'
import type { LineShape } from '../model/types'
import { useBoardPalette } from './paletteContext'

// Sizes follow the line width, so a thick arrow carries bigger packets.
const DOT_FACTOR = 2.2
const GAP_FACTOR = 6
// Slide pixels per second: slow for heavy sync, normal for API, fast for streaming.
const FLOW_SPEEDS = {
  slow: 100,
  normal: 220,
  fast: 460,
} as const

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
  const isPulse = shape.flow?.style === 'pulse'
  const speed = FLOW_SPEEDS[shape.flow?.speed ?? 'normal']
  const period = isPulse ? dot * 8 : dot * GAP_FACTOR
  const dashArray = isPulse ? `${dot * 3} ${dot * 5}` : `0 ${period}`
  const color = palette.ink[shape.color]

  return getLanes(shape, dot).map((lane, index) => {
    const shift = lane.reverse ? period : -period
    const timing = {
      '--flow-shift': `${shift}`,
      '--flow-period': `${period / speed}s`,
    } as CSSProperties
    return (
      <path
        key={index}
        className={`flow-dots ${isRunning ? 'is-running' : ''}`}
        style={{
          ...timing,
          filter: isPulse ? `drop-shadow(0 0 ${Math.max(2, dot * 0.7)}px ${color})` : undefined,
        }}
        d={getLinePath(shape, lane)}
        fill="none"
        stroke={color}
        strokeWidth={dot}
        strokeLinecap="round"
        strokeDasharray={dashArray}
      />
    )
  })
}
