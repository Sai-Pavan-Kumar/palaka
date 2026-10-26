import {
  FONT_FAMILY,
  getStrokeWidth,
  LINE_HEIGHT,
} from '../engine/model/boardSpec'
import {
  getBuilding,
  getBuildingFrame,
  type BuildingSpec,
} from '../engine/model/buildings'
import {
  getBlockLabelLayout,
  getLabelBaseline,
} from '../engine/model/labelLayout'
import type { BlockShape } from '../engine/model/types'
import { useBoardPalette } from '../engine/render/paletteContext'
import { awningPath, roofPath } from './buildingRoofs'
import { EMBLEMS } from './emblems'

type Rect = { x: number; y: number; w: number; h: number }
type Paint = { ink: string; paper: string; sw: number }

const DOOR_SHARE = { single: 0.22, double: 0.34, arch: 0.26, garage: 0.5 }

function doorRect(spec: BuildingSpec, body: Rect): Rect | null {
  if (spec.door === 'none') return null
  const w = body.w * DOOR_SHARE[spec.door]
  const h = Math.min(body.h * 0.3, w * 1.5)
  return { x: body.x + (body.w - w) / 2, y: body.y + body.h - h, w, h }
}

// One path per door: the frame plus its split (double) or slats (garage).
function doorPath(spec: BuildingSpec, d: Rect): string {
  const bottom = d.y + d.h
  if (spec.door === 'arch') {
    const r = d.w / 2
    return `M${d.x},${bottom} L${d.x},${d.y + r} A${r},${r} 0 0 1 ${d.x + d.w},${d.y + r} L${d.x + d.w},${bottom}`
  }
  let path = `M${d.x},${bottom} L${d.x},${d.y} L${d.x + d.w},${d.y} L${d.x + d.w},${bottom}`
  if (spec.door === 'double')
    path += ` M${d.x + d.w / 2},${d.y} L${d.x + d.w / 2},${bottom}`
  if (spec.door === 'garage') {
    for (const t of [0.3, 0.55, 0.8]) {
      path += ` M${d.x},${d.y + d.h * t} L${d.x + d.w},${d.y + d.h * t}`
    }
  }
  return path
}

function windowRects(
  spec: BuildingSpec,
  body: Rect,
  top: number,
  bottom: number,
): Rect[] {
  if (spec.rows === 0 || bottom - top < 12) return []
  const pad = body.w * 0.1
  const gap = Math.max(6, body.w * 0.05)
  const w = (body.w - pad * 2 - gap * (spec.cols - 1)) / spec.cols
  const h = Math.min(
    w * 0.9,
    (bottom - top - gap * (spec.rows - 1)) / spec.rows,
  )
  const rects: Rect[] = []
  for (let r = 0; r < spec.rows; r++) {
    for (let c = 0; c < spec.cols; c++) {
      rects.push({
        x: body.x + pad + c * (w + gap),
        y: top + r * (h + gap),
        w,
        h,
      })
    }
  }
  return rects
}

type FrameProps = {
  shape: BlockShape
  spec: BuildingSpec
  body: Rect
  plate: Rect
  paint: Paint
}

function lineStyle(paint: Paint) {
  return {
    stroke: paint.ink,
    strokeWidth: paint.sw,
    strokeLinejoin: 'round' as const,
    fill: paint.paper,
  }
}

function CanopyFrame({ shape, plate, paint }: FrameProps) {
  const { x, y, w, h } = shape
  const legs = [0.14, 0.86].map(
    (t) => `M${x + w * t},${plate.y + plate.h + 8} L${x + w * t},${y + h}`,
  )
  return (
    <>
      <path d={legs.join(' ')} {...lineStyle(paint)} />
      <rect
        x={x}
        y={plate.y - 8}
        width={w}
        height={plate.h + 16}
        rx={6}
        {...lineStyle(paint)}
      />
    </>
  )
}

function FacadeFrame({ shape, spec, body, plate, paint }: FrameProps) {
  return (
    <>
      <path d={roofPath(spec.roof, shape, body)} {...lineStyle(paint)} />
      <rect
        x={body.x}
        y={body.y}
        width={body.w}
        height={body.h}
        rx={4}
        {...lineStyle(paint)}
      />
      {spec.roof === 'awning' && (
        <path
          d={awningPath(body, plate.y + plate.h + 6, body.h * 0.08)}
          {...lineStyle(paint)}
        />
      )}
    </>
  )
}

// Roof plus facade. Canopies (fuel, metro, toll) and tents have no
// facade, so they draw their own frame instead.
function Structure(props: FrameProps) {
  const { shape, spec, paint } = props
  const { x, y, w, h } = shape
  if (spec.roof === 'tent') {
    const d = `M${x},${y + h} L${x + w / 2},${y} L${x + w},${y + h} Z`
    return <path d={d} {...lineStyle(paint)} />
  }
  if (spec.roof === 'canopy') return <CanopyFrame {...props} />
  return <FacadeFrame {...props} />
}

// Windows and door, the parts that make a box read as a building.
function FacadeDetails({
  spec,
  body,
  plate,
  paint,
}: Omit<FrameProps, 'shape'>) {
  const door = doorRect(spec, body)
  const top = plate.y + plate.h + (spec.roof === 'awning' ? body.h * 0.2 : 12)
  const bottom = (door?.y ?? body.y + body.h) - 10
  return (
    <>
      {windowRects(spec, body, top, bottom).map((r) => (
        <rect
          key={`${r.x},${r.y}`}
          x={r.x}
          y={r.y}
          width={r.w}
          height={r.h}
          rx={2}
          stroke={paint.ink}
          strokeWidth={paint.sw * 0.6}
          fill="none"
        />
      ))}
      {door && (
        <path
          d={doorPath(spec, door)}
          fill={paint.paper}
          stroke={paint.ink}
          strokeWidth={paint.sw * 0.8}
        />
      )}
    </>
  )
}

// The emblem badge says what the building is at a glance (cross =
// hospital, bed = hotel) even before anyone reads the sign.
function Emblem({
  spec,
  body,
  size,
  paint,
}: {
  spec: BuildingSpec
  body: Rect
  size: number
  paint: Paint
}) {
  const Icon = EMBLEMS[spec.emblem]
  if (!Icon) return null
  const r = Math.min(26, Math.max(14, size * 0.09))
  const cx = body.x + body.w
  const cy = body.y + body.h * 0.62
  return (
    <g>
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill={paint.paper}
        stroke={paint.ink}
        strokeWidth={paint.sw * 0.8}
      />
      <Icon
        x={cx - r * 0.6}
        y={cy - r * 0.6}
        size={r * 1.2}
        color={paint.ink}
        strokeWidth={2}
        aria-hidden
      />
    </g>
  )
}

// Name board: ink plate, paper lettering, like a real shop sign.
function Sign({
  shape,
  plate,
  paint,
  hideLabel,
}: {
  shape: BlockShape
  plate: Rect
  paint: Paint
  hideLabel?: boolean
}) {
  const layout = getBlockLabelLayout(shape)
  return (
    <>
      <rect
        x={plate.x}
        y={plate.y}
        width={plate.w}
        height={layout.signH ?? plate.h}
        rx={6}
        fill={paint.ink}
      />
      {!hideLabel && shape.label && (
        <text
          x={layout.centreX}
          y={getLabelBaseline(layout)}
          textAnchor="middle"
          fill={paint.paper}
          fontFamily={FONT_FAMILY.brand}
          fontWeight={700}
          fontSize={layout.fontPx}
          style={{ whiteSpace: 'pre' }}
        >
          {(layout.lines ?? [shape.label]).map((line, i) => (
            <tspan
              key={i}
              x={layout.centreX}
              dy={i === 0 ? 0 : layout.fontPx * LINE_HEIGHT}
            >
              {line}
            </tspan>
          ))}
        </text>
      )}
    </>
  )
}

// A building drawn from its spec: roof, facade, windows, door, a name
// board carrying the block's label, and an emblem badge.
export function BuildingView({
  shape,
  hideLabel,
}: {
  shape: BlockShape
  hideLabel?: boolean
}) {
  const palette = useBoardPalette()
  const spec = getBuilding(shape.icon)
  if (!spec) return null
  const paint: Paint = {
    ink: palette.ink[shape.color],
    paper: palette.paper,
    sw: getStrokeWidth(shape),
  }
  const { body, plate } = getBuildingFrame(shape, spec)
  const parts = { spec, body, plate, paint }
  return (
    <g>
      <Structure shape={shape} {...parts} />
      <FacadeDetails {...parts} />
      <Sign shape={shape} plate={plate} paint={paint} hideLabel={hideLabel} />
      <Emblem
        spec={spec}
        body={body}
        size={Math.min(shape.w, shape.h)}
        paint={paint}
      />
    </g>
  )
}
