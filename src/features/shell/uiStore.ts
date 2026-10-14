import { create } from 'zustand'

export type ToastTone = 'info' | 'success' | 'error'
export type Toast = { id: number; message: string; tone: ToastTone }
export type LeftPanelTab = 'files' | 'order'

type UiState = {
  isFocusMode: boolean
  isLeftPanelOpen: boolean
  leftPanelTab: LeftPanelTab
  isNotesOpen: boolean
  isDrawing: boolean
  isShapeCleanupOn: boolean
  toast: Toast | null
  toggleFocusMode: () => void
  setFocusMode: (on: boolean) => void
  toggleLeftPanel: (tab?: LeftPanelTab) => void
  toggleNotes: () => void
  setDrawing: (drawing: boolean) => void
  toggleShapeCleanup: () => void
  showToast: (message: string, tone?: ToastTone) => void
  dismissToast: () => void
}

let nextToastId = 1

export const useUiStore = create<UiState>((set) => ({
  isFocusMode: false,
  isLeftPanelOpen: false,
  leftPanelTab: 'files',
  isNotesOpen: false,
  isDrawing: false,
  isShapeCleanupOn: false,
  toast: null,
  toggleFocusMode: () => set((s) => ({ isFocusMode: !s.isFocusMode })),
  setFocusMode: (isFocusMode) => set({ isFocusMode }),
  // Clicking the active tab's icon again closes the panel, like a drawer.
  toggleLeftPanel: (tab) =>
    set((s) => {
      const nextTab = tab ?? s.leftPanelTab
      const closing = s.isLeftPanelOpen && nextTab === s.leftPanelTab
      return { isLeftPanelOpen: !closing, leftPanelTab: nextTab }
    }),
  toggleNotes: () => set((s) => ({ isNotesOpen: !s.isNotesOpen })),
  setDrawing: (isDrawing) => set({ isDrawing }),
  toggleShapeCleanup: () =>
    set((s) => ({ isShapeCleanupOn: !s.isShapeCleanupOn })),
  showToast: (message, tone = 'info') =>
    set({ toast: { id: nextToastId++, message, tone } }),
  dismissToast: () => set({ toast: null }),
}))
