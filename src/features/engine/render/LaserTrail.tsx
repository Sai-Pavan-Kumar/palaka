import { useEffect } from 'react'
import { useLaserStore } from '../laserStore'

// Laser red: the one colour that means "look here" on any slide. Matches
// --color-error, which is a plain string here because SVG needs one.
const LASER_COLOR = '#ef4444'
const LASER_WIDTH = 8
const HEAD_RADIUS = 9

// Drawn inside the board, so the pointer shows in the video. A frame loop
// runs only while there is a trail to fade.
export function LaserTrail() {
  const points = useLaserStore((s) => s.points)
  const hasPoints = points.length > 0

  useEffect(() => {
    if (!hasPoints) return
    let frame = requestAnimationFrame(function tick(now) {
      useLaserStore.getState().prune(now)
      frame = requestAnimationFrame(tick)
    })
    return () => cancelAnimationFrame(frame)
  }, [hasPoints])

  if (!hasPoints) return null
  const head = points[points.length - 1]
  return (
    <g className="board-laser">
      <polyline
        points={points.map((p) => `${p.x},${p.y}`).join(' ')}
        fill="none"
        stroke={LASER_COLOR}
        strokeWidth={LASER_WIDTH}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.6}
      />
      <circle cx={head.x} cy={head.y} r={HEAD_RADIUS} fill={LASER_COLOR} />
    </g>
  )
}
