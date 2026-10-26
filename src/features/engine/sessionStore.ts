import { create } from 'zustand'
import { useEngineStore } from './engineStore'
import { findPage } from './model/documentOps'
import { DEFAULT_STYLE, type ShapeStyle } from './model/shapeFactory'
import type { BlockKind, Bounds, StrokePoint } from './model/types'

export type EngineTool =
  | 'select'
  | 'pen'
  | 'highlighter'
  | 'laser'
  | 'rectangle'
  | 'ellipse'
  | 'triangle'
  | 'diamond'
  | 'heart'
  | 'line'
  | 'arrow'
  | 'text'
  | 'eraser'
  | 'block'

// Everything about "where am I and what am I holding". Never saved, never
// undone: undo should take back drawing, not page flips or tool picks.
type SessionState = {
  pageId: string
  selectedIds: string[]
  tool: EngineTool
  style: ShapeStyle
  isShapeCleanupOn: boolean
  // A text shape, or a block / line whose label is being typed.
  editingTextId: string | null
  // Which block the Block tool drops next.
  blockKind: BlockKind
  // Picked from the icon library: the icon and the name it is born with.
  blockIcon: { id: string; label: string } | null
  // Shape a new arrow end would stick to (ring on the overlay).
  bindTargetId: string | null
  // Editing chrome drawn on the overlay layer, never recorded.
  marquee: Bounds | null
  eraserTrail: StrokePoint[]
  snapGuides: import('./model/snapGuides').SnapGuide[] | null
  // Spotlight: dims everything on board except this shape to focus viewer attention
  spotlightId: string | null
  // Reveal: how many steps of each page are showing while presenting.
  presenting: boolean
  revealedUpTo: Record<string, number>
  // Active camera frame (0 = Frame 1, 1 = Frame 2) for multi-frame wide pages
  activeFrame: number
  // The step Space just revealed, which draws itself in. Cleared on step
  // back, page change and leaving Present, so nothing re-animates.
  drawOnStep: { pageId: string; step: number } | null
}

const initialPageId = useEngineStore.getState().doc.pages[0].id

export const useSessionStore = create<SessionState>(() => ({
  pageId: initialPageId,
  selectedIds: [],
  tool: 'pen',
  style: DEFAULT_STYLE,
  isShapeCleanupOn: false,
  editingTextId: null,
  blockKind: 'service',
  blockIcon: null,
  bindTargetId: null,
  marquee: null,
  eraserTrail: [],
  snapGuides: null,
  spotlightId: null,
  presenting: false,
  revealedUpTo: {},
  activeFrame: 0,
  drawOnStep: null,
}))

export const setSession = useSessionStore.setState

export function setCameraFrame(frame: number): void {
  setSession({ activeFrame: Math.max(0, frame) })
}

export function toggleCameraFrame(maxFrames = 2): void {
  const current = useSessionStore.getState().activeFrame
  setSession({ activeFrame: (current + 1) % maxFrames })
}

export function setTool(tool: EngineTool): void {
  const { selectedIds } = useSessionStore.getState()
  setToolInternal(tool, selectedIds)
}

function setToolInternal(tool: EngineTool, selectedIds: string[]): void {
  setSession({ tool, selectedIds: tool === 'select' ? selectedIds : [] })
}

export function toggleTool(tool: EngineTool): void {
  const { tool: current } = useSessionStore.getState()
  setTool(current === tool && tool !== 'select' ? 'select' : tool)
}

export function selectShapes(selectedIds: string[]): void {
  setSession({ selectedIds })
}

export function goToPage(pageId: string): void {
  setSession({
    pageId,
    selectedIds: [],
    editingTextId: null,
    drawOnStep: null,
    activeFrame: 0,
  })
}

// Undo can remove the page you are on or the shapes you selected. Follow
// the document so the session never points at something that is gone.
useEngineStore.subscribe((state, previous) => {
  if (state.doc === previous.doc) return
  const session = useSessionStore.getState()
  const page = findPage(state.doc, session.pageId)
  if (!page) {
    const oldIndex = previous.doc.pages.findIndex(
      (p) => p.id === session.pageId,
    )
    const fallback =
      state.doc.pages[
        Math.min(Math.max(oldIndex, 0), state.doc.pages.length - 1)
      ]
    goToPage(fallback.id)
    return
  }
  const kept = session.selectedIds.filter((id) => page.shapes[id])
  if (kept.length !== session.selectedIds.length) selectShapes(kept)
  if (session.editingTextId && !page.shapes[session.editingTextId]) {
    setSession({ editingTextId: null })
  }
})
