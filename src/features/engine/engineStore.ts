import { create } from 'zustand'
import {
  recordChange,
  stepBack,
  stepForward,
  type HistoryState,
} from './history'
import { createEmptyDocument } from './model/documentOps'
import type { BoardDocument } from './model/types'

type DocRecipe = (doc: BoardDocument) => BoardDocument

type EngineState = HistoryState & {
  // New on every app start (and every hot reload of this module). An open
  // folder is bound to it, so a fresh, empty board can never be saved over
  // the folder's board.
  sessionId: string
  beginChange: () => void
  updateDoc: (recipe: DocRecipe) => void
  endChange: () => void
  commit: (recipe: DocRecipe) => void
  undo: () => void
  redo: () => void
  // Loading a board (browser copy or folder) starts a clean history.
  replaceDocument: (doc: BoardDocument) => void
}

// The saved, undoable board. A drag is one gesture, so it must be one undo
// step: beginChange remembers the document, updateDoc changes it live,
// endChange records a single entry.
export const useEngineStore = create<EngineState>((set, get) => ({
  sessionId: crypto.randomUUID(),
  doc: createEmptyDocument(),
  past: [],
  future: [],
  changeBase: null,
  beginChange: () => {
    if (!get().changeBase) set({ changeBase: get().doc })
  },
  updateDoc: (recipe) => set({ doc: recipe(get().doc) }),
  endChange: () => set(recordChange(get())),
  // Inside an open gesture (say, a style change while typing a label) the
  // edit joins that gesture's undo step instead of cutting it in two.
  commit: (recipe) => {
    const { beginChange, updateDoc, endChange, changeBase } = get()
    if (changeBase) return updateDoc(recipe)
    beginChange()
    updateDoc(recipe)
    endChange()
  },
  undo: () => set(stepBack(get())),
  redo: () => set(stepForward(get())),
  replaceDocument: (doc) =>
    set({ doc, past: [], future: [], changeBase: null }),
}))
