import { useEffect, useRef, type CSSProperties } from 'react'
import { isBuildingBlock } from '../model/buildings'
import { findPage } from '../model/documentOps'
import { useEngineStore } from '../engineStore'
import {
  FONT_FAMILY,
  FONT_WEIGHT,
  LINE_HEIGHT,
  SLIDE_SIZE,
} from '../model/boardSpec'
import {
  getBlockLabelLayout,
  getLineLabelLayout,
  type LabelLayout,
} from '../model/labelLayout'
import { getFontPx, getShapeLines, measureText } from '../model/textMetrics'
import { getPalette } from '../model/paper'
import type { Paper, Shape, TextShape } from '../model/types'
import { useSessionStore } from '../sessionStore'
import { finishTextEditing, updateEditingText } from '../textEditing'

// Room for the caret at the end of the longest line.
const CARET_ROOM_EM = 1

type Slide = { width: number; height: number }

// Percent of the board, so the editor scales with the board like the SVG.
function placement(x: number, y: number, w: number, h: number, slide: Slide) {
  const toWidth = (px: number) => `${(px / slide.width) * 100}cqw`
  return {
    left: `${(x / slide.width) * 100}%`,
    top: `${(y / slide.height) * 100}%`,
    width: toWidth(w),
    height: toWidth(h),
    toWidth,
  }
}

function textStyle(paper: Paper, shape: TextShape, slide: Slide) {
  const fontPx = getFontPx(shape)
  const { w } = measureText(shape)
  const lines = getShapeLines(shape).length
  // A wrapping box is exactly its wrap width, so the textarea breaks lines
  // where the drawn text will.
  const width = shape.wrapWidth ?? w + fontPx * CARET_ROOM_EM
  const { toWidth, ...box } = placement(
    shape.x,
    shape.y,
    width,
    lines * fontPx * LINE_HEIGHT,
    slide,
  )
  return {
    ...box,
    fontSize: toWidth(fontPx),
    fontFamily: FONT_FAMILY[shape.font],
    fontWeight: FONT_WEIGHT[shape.font],
    lineHeight: LINE_HEIGHT,
    color: getPalette(paper).ink[shape.color],
    opacity: shape.opacity,
    ...(shape.wrapWidth && {
      whiteSpace: 'pre-wrap',
      overflowWrap: 'anywhere',
    }),
  }
}

function labelStyle(layout: LabelLayout, color: string, slide: Slide) {
  const { toWidth, ...box } = placement(
    layout.centreX - layout.width / 2,
    layout.top,
    layout.width,
    layout.fontPx * LINE_HEIGHT,
    slide,
  )
  return {
    ...box,
    fontSize: toWidth(layout.fontPx),
    fontFamily: FONT_FAMILY[layout.font],
    fontWeight: FONT_WEIGHT[layout.font],
    lineHeight: LINE_HEIGHT,
    textAlign: 'center' as const,
    color,
  }
}

function editorFor(shape: Shape, paper: Paper, slide: Slide) {
  const palette = getPalette(paper)
  switch (shape.type) {
    case 'text':
      return { value: shape.text, style: textStyle(paper, shape, slide) }
    case 'block': {
      const layout = getBlockLabelLayout(shape)
      // A building's sign is ink with paper lettering, so typing on it
      // must be paper-on-ink too, or the letters vanish into the board.
      if (isBuildingBlock(shape)) {
        const ink = palette.ink[shape.color]
        const style = labelStyle(layout, palette.paper, slide)
        return {
          value: shape.label,
          style: { ...style, background: ink, caretColor: palette.paper },
        }
      }
      const color =
        shape.fill === 'solid' ? palette.onSolid : palette.ink[shape.color]
      return { value: shape.label, style: labelStyle(layout, color, slide) }
    }
    case 'line': {
      const layout = getLineLabelLayout(shape)
      const style = labelStyle(layout, palette.ink[shape.color], slide)
      return {
        value: shape.label ?? '',
        style: { ...style, background: palette.paper },
      }
    }
    default:
      return null
  }
}

// A textarea inside the board element, so live typing shows in the video.
// It sits exactly where the SVG text (or label) will be drawn once editing
// ends.
export function TextEditor() {
  const editingId = useSessionStore((s) => s.editingTextId)
  const doc = useEngineStore((s) => s.doc)
  const pageId = useSessionStore((s) => s.pageId)
  const page = findPage(doc, pageId)
  const shape = editingId ? page?.shapes[editingId] : undefined
  const isLabel = !!shape && shape.type !== 'text'
  const ref = useRef<HTMLTextAreaElement>(null)

  // A label opens fully selected (typing replaces "Service"); a text box
  // opens with the caret at the end, ready to continue.
  useEffect(() => {
    const area = ref.current
    if (!area) return
    area.focus()
    const from = isLabel ? 0 : area.value.length
    area.setSelectionRange(from, area.value.length)
  }, [editingId, isLabel])

  const frameCount = page?.frameCount ?? 1
  const slideSize = {
    width: SLIDE_SIZE[doc.aspect].width * frameCount,
    height: SLIDE_SIZE[doc.aspect].height,
  }
  const editor = shape && editorFor(shape, doc.paper, slideSize)
  if (!shape || !editor) return null
  return (
    <textarea
      ref={ref}
      className="board-text-editor"
      style={editor.style as CSSProperties}
      value={editor.value}
      spellCheck={false}
      aria-label={isLabel ? 'Label on the board' : 'Text on the board'}
      onChange={(event) => updateEditingText(event.target.value)}
      onBlur={finishTextEditing}
      onKeyDown={(event) => {
        const endsLabel = isLabel && event.key === 'Enter'
        if (endsLabel) event.preventDefault()
        if (event.key === 'Escape' || endsLabel) finishTextEditing()
      }}
    />
  )
}
