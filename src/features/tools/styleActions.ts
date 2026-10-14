import { useEngineStore } from '../engine/engineStore'
import { findPage, getShapesInOrder } from '../engine/model/documentOps'
import type { ShapeStyle } from '../engine/model/shapeFactory'
import { getSharedStyle, styleFieldsFor } from '../engine/model/stylePatch'
import type { ShapeType } from '../engine/model/types'
import { useSessionStore, type EngineTool } from '../engine/sessionStore'

// What each drawing tool creates, so the bar shows only the styles that
// shape can use (no "fill" while holding the pen).
const TOOL_SHAPE: Partial<Record<EngineTool, ShapeType>> = {
  pen: 'stroke',
  highlighter: 'stroke',
  rectangle: 'geo',
  ellipse: 'geo',
  triangle: 'geo',
  diamond: 'geo',
  heart: 'geo',
  line: 'line',
  arrow: 'line',
  text: 'text',
}

export type ShownStyle = {
  values: Partial<ShapeStyle>
  fields: Set<keyof ShapeStyle>
  hasSelection: boolean
}

// The selection's styles when something is selected, otherwise the styles
// the next shape will get. Null when the bar has nothing to show.
export function useShownStyle(): ShownStyle | null {
  const doc = useEngineStore((s) => s.doc)
  const pageId = useSessionStore((s) => s.pageId)
  const selectedIds = useSessionStore((s) => s.selectedIds)
  const tool = useSessionStore((s) => s.tool)
  const nextStyle = useSessionStore((s) => s.style)

  const page = findPage(doc, pageId)
  const selected = page ? getShapesInOrder(page, selectedIds) : []
  if (selected.length > 0) {
    return {
      values: getSharedStyle(selected),
      fields: styleFieldsFor(selected.map((shape) => shape.type)),
      hasSelection: true,
    }
  }
  const shapeType = TOOL_SHAPE[tool]
  if (!shapeType) return null
  return {
    values: nextStyle,
    fields: styleFieldsFor([shapeType]),
    hasSelection: false,
  }
}
