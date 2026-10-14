import { useEffect, useRef, type CSSProperties } from 'react'
import { findPage } from '../model/documentOps'
import { useEngineStore } from '../engineStore'
import {
  FONT_FAMILY,
  FONT_WEIGHT,
  LINE_HEIGHT,
  SLIDE_SIZE,
} from '../model/boardSpec'
import { getFontPx, getTextLines, measureText } from '../model/textMetrics'
import { getPalette } from '../model/paper'
import type { Paper, TextShape } from '../model/types'
import { useSessionStore } from '../sessionStore'
import { finishTextEditing, updateEditingText } from '../textEditing'

// Room for the caret at the end of the longest line.
const CARET_ROOM_EM = 1

// Percent of the board, so the editor scales with the board like the SVG.
function editorStyle(
  paper: Paper,

  shape: TextShape,
  slideWidth: number,
  slideHeight: number,
): CSSProperties {
  const fontPx = getFontPx(shape)
  const { w } = measureText(shape)
  const lines = getTextLines(shape.text).length
  const toWidth = (px: number) => `${(px / slideWidth) * 100}cqw`
  return {
    left: `${(shape.x / slideWidth) * 100}%`,
    top: `${(shape.y / slideHeight) * 100}%`,
    width: toWidth(w + fontPx * CARET_ROOM_EM),
    height: toWidth(lines * fontPx * LINE_HEIGHT),
    fontSize: toWidth(fontPx),
    fontFamily: FONT_FAMILY[shape.font],
    fontWeight: FONT_WEIGHT[shape.font],
    lineHeight: LINE_HEIGHT,
    color: getPalette(paper).ink[shape.color],
    opacity: shape.opacity,
  }
}

// A textarea inside the board element, so live typing shows in the video.
// It sits exactly where the SVG text will be drawn once editing ends.
export function TextEditor() {
  const editingId = useSessionStore((s) => s.editingTextId)
  const doc = useEngineStore((s) => s.doc)
  const pageId = useSessionStore((s) => s.pageId)
  const ref = useRef<HTMLTextAreaElement>(null)
  const shape = editingId ? findPage(doc, pageId)?.shapes[editingId] : undefined

  useEffect(() => {
    const area = ref.current
    if (!area) return
    area.focus()
    area.setSelectionRange(area.value.length, area.value.length)
  }, [editingId])

  if (shape?.type !== 'text') return null
  const { width, height } = SLIDE_SIZE[doc.aspect]
  return (
    <textarea
      ref={ref}
      className="board-text-editor"
      style={editorStyle(doc.paper, shape, width, height)}
      value={shape.text}
      spellCheck={false}
      aria-label="Text on the board"
      onChange={(event) => updateEditingText(event.target.value)}
      onBlur={finishTextEditing}
      onKeyDown={(event) => {
        if (event.key === 'Escape') finishTextEditing()
      }}
    />
  )
}
