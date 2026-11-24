import { create } from 'zustand'

export type ExplainModeId = 'sql' | 'code' | 'system' | 'git'

const STORAGE_KEY = 'palaka.explainMode'
const MODE_IDS: ExplainModeId[] = ['sql', 'code', 'system', 'git']

// Remembered per browser: the owner usually records a whole series in one
// mode, so reopening the panel should land where they left off.
function loadMode(): ExplainModeId {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    return MODE_IDS.find((id) => id === saved) ?? 'sql'
  } catch {
    return 'sql'
  }
}

export const useExplainStore = create<{ mode: ExplainModeId }>(() => ({
  mode: loadMode(),
}))

export function setExplainMode(mode: ExplainModeId) {
  useExplainStore.setState({ mode })
  try {
    localStorage.setItem(STORAGE_KEY, mode)
  } catch {
    // Only the remembered choice is lost; this session keeps it.
  }
}
