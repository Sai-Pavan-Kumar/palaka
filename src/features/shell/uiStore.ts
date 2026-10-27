import { create } from 'zustand'

export type ToastTone = 'info' | 'success' | 'error'
export type Toast = { id: number; message: string; tone: ToastTone }
export type LeftPanelTab = 'files' | 'order' | 'sql' | 'code'

type UiState = {
  isFocusMode: boolean
  // Speaker-only faint preview of objects still to come while presenting.
  showUpcoming: boolean
  isLeftPanelOpen: boolean
  leftPanelTab: LeftPanelTab
  isNotesOpen: boolean
  isDrawing: boolean
  toast: Toast | null
  toggleFocusMode: () => void
  toggleUpcoming: () => void
  setFocusMode: (on: boolean) => void
  toggleLeftPanel: (tab?: LeftPanelTab) => void
  toggleNotes: () => void
  setDrawing: (drawing: boolean) => void
  showToast: (message: string, tone?: ToastTone) => void
  dismissToast: () => void
}

let nextToastId = 1

export const useUiStore = create<UiState>((set) => ({
  isFocusMode: false,
  showUpcoming: true,
  isLeftPanelOpen: false,
  leftPanelTab: 'files',
  isNotesOpen: false,
  isDrawing: false,
  toast: null,
  toggleFocusMode: () => set((s) => ({ isFocusMode: !s.isFocusMode })),
  toggleUpcoming: () => set((s) => ({ showUpcoming: !s.showUpcoming })),
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
  showToast: (message, tone = 'info') =>
    set({ toast: { id: nextToastId++, message, tone } }),
  dismissToast: () => set({ toast: null }),
}))
