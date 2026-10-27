import { editCurrentPage, getCurrentPage } from './boardActions'
import { useEngineStore } from './engineStore'
import { findPage, removeShapes, replaceShapes } from './model/documentOps'
import { fitTextToBoard, textAreaFor } from './model/textFit'
import type { Shape, TextShape } from './model/types'
import { setSession, useSessionStore } from './sessionStore'

// A whole typing session (open box → type → click away) is one undo step.
export function startTextEditing(shapeId: string): void {
  useEngineStore.getState().beginChange()
  setSession({ editingTextId: shapeId, selectedIds: [] })
}

// Text boxes take many lines; block and connector labels stay on one line,
// so a diagram never grows a paragraph inside a box.
export function updateEditingText(text: string): void {
  const { editingTextId } = useSessionStore.getState()
  const shape = editingTextId ? getCurrentPage().shapes[editingTextId] : null
  if (!shape) return
  const label = text.replace(/\n/g, ' ')
  let next: Shape
  if (shape.type === 'text') next = fitTyped({ ...shape, text })
  else if (shape.type === 'block' || shape.type === 'line') {
    next = { ...shape, label }
  } else return
  editCurrentPage((page) => replaceShapes(page, [next]))
}

function fitTyped(shape: TextShape): TextShape {
  const { doc } = useEngineStore.getState()
  const frames = getCurrentPage().frameCount ?? 1
  return fitTextToBoard(shape, textAreaFor(shape.x, doc.aspect, frames))
}

export function hasEditableLabel(shape: Shape): boolean {
  return shape.type === 'block' || shape.type === 'line'
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
