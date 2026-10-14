import { create } from 'zustand'

type BoardState = {
  boardElement: HTMLDivElement | null
  setBoardElement: (element: HTMLDivElement | null) => void
}

// Holds the capture target element so the recorder outside the board can
// reach it.
export const useBoardStore = create<BoardState>((set) => ({
  boardElement: null,
  setBoardElement: (boardElement) => set({ boardElement }),
}))
