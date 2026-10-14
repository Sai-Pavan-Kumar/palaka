import { memo, useMemo, type CSSProperties } from 'react'
import {
  FONT_FAMILY,
  FONT_WEIGHT,
  HIGHLIGHT_OPACITY,
  LINE_HEIGHT,
  TINT,
} from '../model/boardSpec'
import {
  getBaselineOffset,
  getFontPx,
  getTextLines,
} from '../model/textMetrics'
import type { ImageShape, Shape, StrokeShape, TextShape } from '../model/types'
import { DrawOnMask } from './DrawOnMask'
import { drawMaskId, getDrawDuration } from './drawOnPlan'
import { GeoView, LineView } from './GeoLineViews'
import { useBoardPalette } from './paletteContext'
import { getStrokePath } from './shapePaths'

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

// Baselines follow CSS line layout, the same way the text editor (a textarea
// with the same line height) places them, so text does not jump when
// editing ends.
function TextView({ shape }: { shape: TextShape }) {
  const palette = useBoardPalette()
  const fontPx = getFontPx(shape)
  const lineBox = fontPx * LINE_HEIGHT
  const baseline = getBaselineOffset(shape)
  return (
    <text
      fill={palette.ink[shape.color]}
      fontFamily={FONT_FAMILY[shape.font]}
      fontWeight={FONT_WEIGHT[shape.font]}
      fontSize={fontPx}
      style={{ whiteSpace: 'pre' }}
    >
      {getTextLines(shape.text).map((line, index) => (
        <tspan key={index} x={shape.x} y={shape.y + index * lineBox + baseline}>
          {line || ' '}
        </tspan>
      ))}
    </text>
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

function ShapeBody({ shape, imageUrl }: { shape: Shape; imageUrl?: string }) {
  switch (shape.type) {
    case 'stroke':
      return <StrokeView shape={shape} />
    case 'geo':
      return <GeoView shape={shape} />
    case 'line':
      return <LineView shape={shape} />
    case 'text':
      return <TextView shape={shape} />
    case 'image':
      return <ImageView shape={shape} url={imageUrl} />
  }
}

// The shape draws itself along its own path. A geo shape's fill is kept out
// of the mask and fades in once the outline has closed.
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
      <DrawOnMask shape={shape} />
      {shape.type === 'stroke' ? (
        <StrokeView shape={shape} mask={mask} />
      ) : shape.type === 'geo' ? (
        <>
          <g className="draw-on-fill" style={timing}>
            <GeoView shape={shape} part="fill" />
          </g>
          <g mask={mask}>
            <GeoView shape={shape} part="outline" />
          </g>
        </>
      ) : (
        <g mask={mask}>
          <ShapeBody shape={shape} />
        </g>
      )}
    </>
  )
}

type ShapeViewProps = {
  shape: Shape
  imageUrl?: string
  // Text being edited is drawn by the editor instead, so it never doubles.
  isHidden?: boolean
  // Just revealed while presenting: animate it being drawn.
  drawOn?: boolean
}

// Memo by shape object: shapes are immutable, so while one stroke is being
// drawn every other shape on the board skips re-rendering.
export const ShapeView = memo(function ShapeView({
  shape,
  imageUrl,
  isHidden = false,
  drawOn = false,
}: ShapeViewProps) {
  const duration = drawOn ? getDrawDuration(shape) : null
  return (
    <g
      className={`board-shape ${duration !== null ? 'is-drawing-on' : ''}`}
      opacity={shape.opacity < 1 ? shape.opacity : undefined}
      visibility={isHidden ? 'hidden' : undefined}
    >
      {duration !== null ? (
        <DrawingOnBody shape={shape} duration={duration} />
      ) : (
        <ShapeBody shape={shape} imageUrl={imageUrl} />
      )}
    </g>
  )
})
