import { memo, useMemo, type CSSProperties } from 'react'
import { motionSeconds, speedFactor, type Motion } from '../../animate/motion'
import '../../animate/animate.css'
import { HIGHLIGHT_OPACITY, TINT } from '../model/boardSpec'
import type { ImageShape, Shape, StrokeShape } from '../model/types'
import { DrawOnMask } from './DrawOnMask'
import { drawMaskId, getDrawDuration } from './drawOnPlan'
import { BlockContents, BlockView } from './BlockView'
import { FlowDots } from './FlowDots'
import { GeoView, LineGlow, LineLabel, LineView } from './GeoLineViews'
import { useBoardPalette } from './paletteContext'
import type { RowState } from '../model/highlights'
import { getStrokePath } from './shapePaths'
import { TableContents, TableView } from './TableView'
import { TextView } from './TextView'

// The highlighter takes its mask on the path itself: a masked group would
// cut it off from the ink below, and the marker would stop blending.
function StrokeView({ shape, mask }: { shape: StrokeShape; mask?: string }) {
  const palette = useBoardPalette()
  const path = useMemo(() => getStrokePath(shape), [shape])
  const isHighlighter = shape.kind === 'highlighter'
  return (
    <path
      d={path}
      mask={mask}
      fill={
        isHighlighter
          ? palette.highlight[shape.color]
          : palette.ink[shape.color]
      }
      opacity={isHighlighter ? HIGHLIGHT_OPACITY : undefined}
      // Overlapping highlighter passes darken (light paper) or glow (dark
      // paper) like a real marker.
      style={
        isHighlighter ? { mixBlendMode: palette.highlightBlend } : undefined
      }
    />
  )
}

function ImageView({ shape, url }: { shape: ImageShape; url?: string }) {
  if (!url) {
    // The file is missing or still loading: keep its place visible.
    return (
      <rect
        x={shape.x}
        y={shape.y}
        width={shape.w}
        height={shape.h}
        fill={TINT.black}
      />
    )
  }
  return (
    <image
      href={url}
      x={shape.x}
      y={shape.y}
      width={shape.w}
      height={shape.h}
      preserveAspectRatio="none"
    />
  )
}

type ShapeBodyProps = {
  shape: Shape
  imageUrl?: string
  // A block or line label being edited is drawn by the editor instead.
  hideLabel?: boolean
  isFlowing?: boolean
  highlighted?: ReadonlySet<string>
  isGlowing?: boolean
  rowStates?: RowState[]
  focusLine?: number
}

function ShapeBody({
  shape,
  imageUrl,
  hideLabel,
  isFlowing,
  highlighted,
  isGlowing,
  rowStates,
  focusLine,
}: ShapeBodyProps) {
  switch (shape.type) {
    case 'stroke':
      return <StrokeView shape={shape} />
    case 'geo':
      return <GeoView shape={shape} />
    case 'block':
      return <BlockView shape={shape} hideLabel={hideLabel} />
    case 'table':
      return (
        <TableView
          shape={shape}
          highlighted={highlighted}
          rowStates={rowStates}
        />
      )
    case 'line':
      return (
        <>
          {isGlowing && <LineGlow shape={shape} />}
          <LineView shape={shape} />
          {shape.flow && (
            <FlowDots shape={shape} isRunning={isFlowing ?? false} />
          )}
          {!hideLabel && <LineLabel shape={shape} />}
        </>
      )
    case 'text':
      return <TextView shape={shape} focusLine={focusLine} />
    case 'image':
      return <ImageView shape={shape} url={imageUrl} />
  }
}

// What fades in once the traced line is done: a box's fill, a block's icon
// and label, a connector's label (the mask band is too thin for them).
function FadeInPart({ shape }: { shape: Shape }) {
  switch (shape.type) {
    case 'geo':
      return <GeoView shape={shape} part="fill" />
    case 'block':
      return (
        <>
          <GeoView shape={shape} part="fill" />
          <BlockContents shape={shape} />
        </>
      )
    case 'line':
      return <LineLabel shape={shape} />
    case 'table':
      return <TableContents shape={shape} />
    default:
      return null
  }
}

function TracedPart({ shape }: { shape: Shape }) {
  if (
    shape.type === 'geo' ||
    shape.type === 'block' ||
    shape.type === 'table'
  ) {
    return <GeoView shape={shape} part="outline" />
  }
  if (shape.type === 'line') return <LineView shape={shape} />
  return <ShapeBody shape={shape} />
}

// The shape draws itself along its own path. Fills, icons and labels are
// kept out of the mask and fade in once the line has been drawn.
function DrawingOnBody({
  shape,
  duration,
}: {
  shape: Shape
  duration: number
}) {
  const mask = `url(#${drawMaskId(shape)})`
  const timing = { '--draw-duration': `${duration}s` } as CSSProperties
  return (
    <>
      <DrawOnMask shape={shape} duration={duration} />
      {shape.type === 'stroke' ? (
        <StrokeView shape={shape} mask={mask} />
      ) : (
        <>
          <g className="draw-on-fill" style={timing}>
            <FadeInPart shape={shape} />
          </g>
          <g mask={mask}>
            <TracedPart shape={shape} />
          </g>
        </>
      )}
    </>
  )
}

// Draw-on has its own masks; every other motion is one CSS class on the
// shape's group, so images, tables and blocks all animate the same way.
function motionClass(shape: Shape, motion: Motion | null, drawsIn: boolean) {
  if (!motion || drawsIn) return undefined
  if (motion === 'enter') return `anim anim-enter-${shape.enter}`
  if (motion === 'exit') return `anim anim-exit-${shape.exit?.style ?? 'fade'}`
  return 'anim anim-pulse'
}

function motionStyle(
  shape: Shape,
  motion: Motion | null,
  drawsIn: boolean,
): CSSProperties | undefined {
  if (!motion || drawsIn) return undefined
  return {
    '--anim-duration': `${motionSeconds(shape, motion)}s`,
  } as CSSProperties
}

type ShapeViewProps = {
  shape: Shape
  imageUrl?: string
  // Text (or a label) being edited is drawn by the editor instead, so it
  // never doubles.
  isHidden?: boolean
  // What the step being played does to it (presenting only).
  motion?: Motion | null
  // Flow dots move (presenting, their step reached); otherwise they stand.
  isFlowing?: boolean
  // Columns lit by a highlight step (tables) / joins two lit columns (lines).
  highlighted?: ReadonlySet<string>
  isGlowing?: boolean
  // Row states of the query clause shown on this table (presenting only).
  rowStates?: RowState[]
  // Query card line of the running clause (presenting only).
  focusLine?: number
}

// Memo by shape object: shapes are immutable, so while one stroke is being
// drawn every other shape on the board skips re-rendering.
export const ShapeView = memo(function ShapeView({
  shape,
  imageUrl,
  isHidden = false,
  motion = null,
  isFlowing = false,
  highlighted,
  isGlowing = false,
  rowStates,
  focusLine,
}: ShapeViewProps) {
  const drawsIn = motion === 'enter' && (shape.enter ?? 'draw') === 'draw'
  const drawSeconds = drawsIn ? getDrawDuration(shape) : null
  const duration =
    drawSeconds === null ? null : drawSeconds * speedFactor(shape)
  // The outer group skips its mount fade while a motion plays. The motion
  // itself sits on an inner group, so when its class goes away the outer
  // animation name never changes and nothing replays.
  const ownsEntrance = duration !== null || (motion === 'enter' && !drawsIn)
  return (
    <g
      className={`board-shape ${ownsEntrance ? 'is-drawing-on' : ''}`}
      opacity={shape.opacity < 1 ? shape.opacity : undefined}
      visibility={isHidden && shape.type === 'text' ? 'hidden' : undefined}
    >
      <g
        className={motionClass(shape, motion, drawsIn)}
        style={motionStyle(shape, motion, drawsIn)}
      >
        {duration !== null ? (
          <DrawingOnBody shape={shape} duration={duration} />
        ) : (
          <ShapeBody
            shape={shape}
            imageUrl={imageUrl}
            hideLabel={isHidden}
            isFlowing={isFlowing}
            highlighted={highlighted}
            isGlowing={isGlowing}
            rowStates={rowStates}
            focusLine={focusLine}
          />
        )}
      </g>
    </g>
  )
})
