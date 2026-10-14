import type { Editor } from 'tldraw'
import { create } from 'zustand'

type BoardState = {
  editor: Editor | null
  boardElement: HTMLDivElement | null
  setEditor: (editor: Editor | null) => void
  setBoardElement: (element: HTMLDivElement | null) => void
}

// Holds the live tldraw editor and the capture target element so tool bars
// and the recorder outside the board can reach them.
export const useBoardStore = create<BoardState>((set) => ({
  editor: null,
  boardElement: null,
  setEditor: (editor) => set({ editor }),
  setBoardElement: (boardElement) => set({ boardElement }),
}))

// For chrome that App mounts only after the editor exists.
export function useActiveEditor(): Editor {
  const editor = useBoardStore((s) => s.editor)
  if (!editor) throw new Error('Board editor is not ready yet.')
  return editor
}
