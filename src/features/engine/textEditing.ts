import { editCurrentPage, getCurrentPage } from './boardActions'
import { useEngineStore } from './engineStore'
import { findPage, removeShapes, replaceShapes } from './model/documentOps'
import type { TextShape } from './model/types'
import { setSession, useSessionStore } from './sessionStore'

// A whole typing session (open box → type → click away) is one undo step.
export function startTextEditing(shapeId: string): void {
  useEngineStore.getState().beginChange()
  setSession({ editingTextId: shapeId, selectedIds: [] })
}

export function updateEditingText(text: string): void {
  const { editingTextId } = useSessionStore.getState()
  const shape = editingTextId ? getCurrentPage().shapes[editingTextId] : null
  if (shape?.type !== 'text') return
  const next: TextShape = { ...shape, text }
  editCurrentPage((page) => replaceShapes(page, [next]))
}

// Safe to call twice (blur and click can both finish an edit). An empty box
// leaves nothing behind, not even an undo step.
export function finishTextEditing(): void {
  const { editingTextId } = useSessionStore.getState()
  if (!editingTextId) return
  setSession({ editingTextId: null })
  const store = useEngineStore.getState()
  const shape = getCurrentPage().shapes[editingTextId]
  if (shape?.type === 'text' && shape.text.trim() === '') {
    const base = store.changeBase
    // Back to the exact document from before the box opened, so endChange
    // sees no change and records nothing.
    if (base && !findPage(base, getCurrentPage().id)?.shapes[editingTextId]) {
      store.updateDoc(() => base)
    } else {
      editCurrentPage((page) => removeShapes(page, [editingTextId]))
    }
  }
  store.endChange()
}
