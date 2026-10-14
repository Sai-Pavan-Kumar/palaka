import { create } from 'zustand'

type NotesState = {
  notes: Record<string, string>
  setNote: (pageId: string, text: string) => void
  replaceNotes: (notes: Record<string, string>) => void
}

// Notes are saved in the same file as the board but kept out of its undo
// history: Ctrl Z should undo drawing, never typing in notes.
export const useNotesStore = create<NotesState>((set, get) => ({
  notes: {},
  setNote: (pageId, text) => set({ notes: { ...get().notes, [pageId]: text } }),
  replaceNotes: (notes) => set({ notes }),
}))
