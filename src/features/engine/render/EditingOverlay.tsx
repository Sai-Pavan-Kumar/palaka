import { useEngineStore } from '../engineStore'
import { findPage } from '../model/documentOps'
import { LINE_HEIGHT } from '../model/boardSpec'
import {
  getBoundsCentre,
  getLocalBounds,
  getRotation,
  getShapeBounds,
} from '../model/geometry'
import { getBlockLabelLayout, getLineLabelLayout } from '../model/labelLayout'
import { rotationTransform } from '../model/rotation'
import { useSessionStore } from '../sessionStore'
import type {
  Bounds,
  LineShape,
  Page,
  Shape,
  StrokePoint,
} from '../model/types'
import {
  getCornerPoint,
  getLineEndPoint,
  getRotateHandlePoint,
  getSelectionFrame,
  getSoloLine,
  HANDLE_CORNERS,
  HANDLE_SIZE_PX,
  type SelectionFrame,
} from '../tools/selectionHandles'

type EditingOverlayProps = {
  width: number
  height: number
  unitsPerPixel: number
}

function frameTransform({ bounds, rotation }: SelectionFrame) {
  return rotation === 0
    ? undefined
    : rotationTransform(rotation, getBoundsCentre(bounds))
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

function RotateHandle({
  bounds,
  unitsPerPixel,
}: {
  bounds: Bounds
  unitsPerPixel: number
}) {
  const handle = getRotateHandlePoint(bounds, unitsPerPixel)
  return (
    <>
      <line
        className="board-overlay__rotate-stem"
        x1={handle.x}
        y1={handle.y}
        x2={handle.x}
        y2={bounds.minY}
      />
      <circle
        className="board-overlay__handle is-rotate"
        cx={handle.x}
        cy={handle.y}
        r={(HANDLE_SIZE_PX / 2 + 1) * unitsPerPixel}
      />
    </>
  )
}

function SelectionFrameView({
  frame,
  unitsPerPixel,
  isLocked,
}: {
  frame: SelectionFrame
  unitsPerPixel: number
  isLocked?: boolean
}) {
  const { bounds } = frame
  const size = HANDLE_SIZE_PX * unitsPerPixel
  const lockR = 9 * unitsPerPixel
  return (
    <g transform={frameTransform(frame)}>
      {!isLocked && (
        <RotateHandle bounds={bounds} unitsPerPixel={unitsPerPixel} />
      )}
      <BoundsRect
        bounds={bounds}
        className={`board-overlay__selection ${isLocked ? 'is-locked' : ''}`}
      />
      {!isLocked &&
        HANDLE_CORNERS.map((corner) => {
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
      {isLocked && (
        <g
          transform={`translate(${bounds.maxX - lockR - 4 * unitsPerPixel}, ${bounds.minY + lockR + 4 * unitsPerPixel})`}
        >
          <circle r={lockR} fill="#E24A4A" cx={0} cy={0} />
          <path
            d="M -3 -1 L -3 -3 A 3 3 0 0 1 3 -3 L 3 -1 L 4 -1 L 4 4 L -4 4 L -4 -1 Z M -1.5 -1 L 1.5 -1 L 1.5 -3 A 1.5 1.5 0 0 0 -1.5 -3 Z"
            fill="#FFFFFF"
          />
        </g>
      )}
    </g>
  )
}

// Label editing happens in a textarea that sits exactly on the label, so
// without this frame you cannot tell you are typing instead of selecting.
function LabelEditFrame({ shape }: { shape: Shape | undefined }) {
  if (shape?.type !== 'block' && shape?.type !== 'line') return null
  const layout =
    shape.type === 'block'
      ? getBlockLabelLayout(shape)
      : getLineLabelLayout(shape)
  const pad = layout.fontPx * 0.25
  const height = layout.fontPx * LINE_HEIGHT
  return (
    <g
      transform={frameTransform({
        bounds: getLocalBounds(shape),
        rotation: getRotation(shape),
      })}
    >
      <BoundsRect
        className="board-overlay__label-edit"
        bounds={{
          minX: layout.centreX - layout.width / 2 - pad,
          minY: layout.top - pad,
          maxX: layout.centreX + layout.width / 2 + pad,
          maxY: layout.top + height + pad,
        }}
      />
    </g>
  )
}

function LineEndHandles({
  line,
  unitsPerPixel,
}: {
  line: LineShape
  unitsPerPixel: number
}) {
  const radius = (HANDLE_SIZE_PX / 2 + 1) * unitsPerPixel
  return (['start', 'end'] as const).map((end) => {
    const point = getLineEndPoint(line, end)
    return (
      <circle
        key={end}
        className="board-overlay__handle"
        cx={point.x}
        cy={point.y}
        r={radius}
      />
    )
  })
}

function SnapGuidesView({
  guides,
  unitsPerPixel,
}: {
  guides: import('../model/snapGuides').SnapGuide[] | null
  unitsPerPixel: number
}) {
  if (!guides || guides.length === 0) return null
  const sw = 1.5 * unitsPerPixel
  const dash = `${4 * unitsPerPixel} ${4 * unitsPerPixel}`
  return (
    <g className="board-overlay__snap-guides">
      {guides.map((g, i) =>
        g.type === 'x' ? (
          <line
            key={`snap-x-${i}`}
            x1={g.x}
            y1={g.minY}
            x2={g.x}
            y2={g.maxY}
            stroke="#E0007B"
            strokeWidth={sw}
            strokeDasharray={dash}
          />
        ) : (
          <line
            key={`snap-y-${i}`}
            x1={g.minX}
            y1={g.y}
            x2={g.maxX}
            y2={g.y}
            stroke="#E0007B"
            strokeWidth={sw}
            strokeDasharray={dash}
          />
        ),
      )}
    </g>
  )
}

function OverlayExtras({
  bindTarget,
  marquee,
  eraserTrail,
  snapGuides,
  unitsPerPixel,
}: {
  bindTarget?: Shape
  marquee: Bounds | null
  eraserTrail: StrokePoint[]
  snapGuides: import('../model/snapGuides').SnapGuide[] | null
  unitsPerPixel: number
}) {
  return (
    <>
      <SnapGuidesView guides={snapGuides} unitsPerPixel={unitsPerPixel} />
      {bindTarget && (
        <BoundsRect
          bounds={getShapeBounds(bindTarget)}
          className="board-overlay__bind-target"
        />
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
    </>
  )
}

// A line has no box to resize, so it gets its end handles plus the turn handle.
function SelectionMarks({
  page,
  selectedIds,
  unitsPerPixel,
}: {
  page: Page
  selectedIds: string[]
  unitsPerPixel: number
}) {
  const rotatingFrame = useSessionStore((s) => s.rotatingFrame)
  const frame = rotatingFrame ?? getSelectionFrame(page, selectedIds)
  const soloLine = getSoloLine(page, selectedIds)
  const isLocked = selectedIds.some((id) => page.shapes[id]?.locked)
  if (!soloLine) {
    return (
      frame && (
        <SelectionFrameView
          frame={frame}
          unitsPerPixel={unitsPerPixel}
          isLocked={isLocked}
        />
      )
    )
  }
  return (
    <>
      <LineEndHandles line={soloLine} unitsPerPixel={unitsPerPixel} />
      {frame && !isLocked && (
        <g transform={frameTransform(frame)}>
          <RotateHandle bounds={frame.bounds} unitsPerPixel={unitsPerPixel} />
        </g>
      )}
    </>
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
  const bindTargetId = useSessionStore((s) => s.bindTargetId)
  const snapGuides = useSessionStore((s) => s.snapGuides)
  const editingId = useSessionStore((s) => s.editingTextId)
  const page = findPage(doc, pageId)

  return (
    <svg
      className="board-overlay"
      viewBox={`0 0 ${width} ${height}`}
      aria-hidden
    >
      {page && (
        <SelectionMarks
          page={page}
          selectedIds={selectedIds}
          unitsPerPixel={unitsPerPixel}
        />
      )}
      {page && editingId && <LabelEditFrame shape={page.shapes[editingId]} />}
      <OverlayExtras
        bindTarget={bindTargetId ? page?.shapes[bindTargetId] : undefined}
        marquee={marquee}
        eraserTrail={eraserTrail}
        snapGuides={snapGuides}
        unitsPerPixel={unitsPerPixel}
      />
    </svg>
  )
}
