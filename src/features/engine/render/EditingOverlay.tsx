import { useEngineStore } from '../engineStore'
import { findPage } from '../model/documentOps'
import { useSessionStore } from '../sessionStore'
import type { Bounds } from '../model/types'
import {
  getCornerPoint,
  getSelectionBounds,
  HANDLE_CORNERS,
  HANDLE_SIZE_PX,
} from '../tools/selectionHandles'

type EditingOverlayProps = {
  width: number
  height: number
  unitsPerPixel: number
}

function BoundsRect({
  bounds,
  className,
}: {
  bounds: Bounds
  className: string
}) {
  return (
    <rect
      className={className}
      x={bounds.minX}
      y={bounds.minY}
      width={bounds.maxX - bounds.minX}
      height={bounds.maxY - bounds.minY}
    />
  )
}

function SelectionFrame({
  bounds,
  unitsPerPixel,
}: {
  bounds: Bounds
  unitsPerPixel: number
}) {
  const size = HANDLE_SIZE_PX * unitsPerPixel
  return (
    <g>
      <BoundsRect bounds={bounds} className="board-overlay__selection" />
      {HANDLE_CORNERS.map((corner) => {
        const point = getCornerPoint(bounds, corner)
        return (
          <rect
            key={corner}
            className={`board-overlay__handle is-${corner}`}
            x={point.x - size / 2}
            y={point.y - size / 2}
            width={size}
            height={size}
            rx={size / 4}
          />
        )
      })}
    </g>
  )
}

// Sibling of the recorded board, same size and viewBox. Selection boxes,
// handles, marquee and eraser trail help the teacher and never reach the video.
export function EditingOverlay({
  width,
  height,
  unitsPerPixel,
}: EditingOverlayProps) {
  const doc = useEngineStore((s) => s.doc)
  const pageId = useSessionStore((s) => s.pageId)
  const selectedIds = useSessionStore((s) => s.selectedIds)
  const marquee = useSessionStore((s) => s.marquee)
  const eraserTrail = useSessionStore((s) => s.eraserTrail)
  const page = findPage(doc, pageId)
  const selection = page && getSelectionBounds(page, selectedIds)

  return (
    <svg
      className="board-overlay"
      viewBox={`0 0 ${width} ${height}`}
      aria-hidden
    >
      {selection && (
        <SelectionFrame bounds={selection} unitsPerPixel={unitsPerPixel} />
      )}
      {marquee && (
        <BoundsRect bounds={marquee} className="board-overlay__marquee" />
      )}
      {eraserTrail.length > 1 && (
        <polyline
          className="board-overlay__eraser"
          points={eraserTrail.map(([x, y]) => `${x},${y}`).join(' ')}
        />
      )}
    </svg>
  )
}
