import type { Bounds } from '../model/types'

type SpotlightOverlayProps = {
  bounds: Bounds
  width: number
  height: number
  onDismiss: () => void
}

const PAD = 16
const CORNER_RADIUS = 12

type CutoutRect = { x: number; y: number; w: number; h: number }

function SpotlightMask({
  cutout,
  width,
  height,
}: {
  cutout: CutoutRect
  width: number
  height: number
}) {
  return (
    <defs>
      <mask id="spotlight-mask">
        <rect x={0} y={0} width={width} height={height} fill="#FFFFFF" />
        <rect
          x={cutout.x}
          y={cutout.y}
          width={cutout.w}
          height={cutout.h}
          rx={CORNER_RADIUS}
          fill="#000000"
        />
      </mask>
    </defs>
  )
}

export function SpotlightOverlay({
  bounds,
  width,
  height,
  onDismiss,
}: SpotlightOverlayProps) {
  const cutout: CutoutRect = {
    x: bounds.minX - PAD,
    y: bounds.minY - PAD,
    w: Math.max(0, bounds.maxX - bounds.minX + PAD * 2),
    h: Math.max(0, bounds.maxY - bounds.minY + PAD * 2),
  }

  return (
    <g className="board-spotlight" onClick={onDismiss}>
      <SpotlightMask cutout={cutout} width={width} height={height} />
      <rect
        x={0}
        y={0}
        width={width}
        height={height}
        fill="rgba(0, 0, 0, 0.62)"
        mask="url(#spotlight-mask)"
        style={{ cursor: 'pointer', transition: 'opacity 0.2s ease-out' }}
      />
      <rect
        x={cutout.x}
        y={cutout.y}
        width={cutout.w}
        height={cutout.h}
        rx={CORNER_RADIUS}
        fill="none"
        stroke="#005AE0"
        strokeWidth={2.5}
        strokeOpacity={0.85}
        style={{ pointerEvents: 'none' }}
      />
    </g>
  )
}
