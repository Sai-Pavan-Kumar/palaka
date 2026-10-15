import { create } from 'zustand'

type NotesState = {
  notes: Record<string, string>
  // Pasted SQL per page, so a schema can be tweaked and inserted again.
  sql: Record<string, string>
  setNote: (pageId: string, text: string) => void
  setSql: (pageId: string, text: string) => void
  replaceNotes: (
    notes: Record<string, string>,
    sql?: Record<string, string>,
  ) => void
}

// Notes (and pasted SQL) are saved in the same file as the board but kept out of its undo
// history: Ctrl Z should undo drawing, never typing in notes.
export const useNotesStore = create<NotesState>((set, get) => ({
  notes: {},
  sql: {},
  setNote: (pageId, text) => set({ notes: { ...get().notes, [pageId]: text } }),
  setSql: (pageId, text) => set({ sql: { ...get().sql, [pageId]: text } }),
  replaceNotes: (notes, sql = {}) => set({ notes, sql }),
}))
