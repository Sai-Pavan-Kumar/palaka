import type { BoardDocument } from './model/types'

// A long session is a few hundred edits; old documents share most of their
// shapes with new ones, so this costs little memory.
const HISTORY_LIMIT = 300

export type HistoryState = {
  doc: BoardDocument
  past: BoardDocument[]
  future: BoardDocument[]
  // Document as it was when the current drag began; null when idle.
  changeBase: BoardDocument | null
}

// Closes a drag. A drag that changed nothing (a click) leaves no undo step.
export function recordChange(state: HistoryState): Partial<HistoryState> {
  const { changeBase, doc, past } = state
  if (!changeBase || changeBase === doc) return { changeBase: null }
  return {
    changeBase: null,
    past: [...past, changeBase].slice(-HISTORY_LIMIT),
    future: [],
  }
}

// Undo and redo wait while a drag is in progress, so a half-made stroke can
// never be split across history entries.
export function stepBack(state: HistoryState): Partial<HistoryState> {
  const { past, future, doc, changeBase } = state
  if (changeBase || past.length === 0) return {}
  return {
    doc: past[past.length - 1],
    past: past.slice(0, -1),
    future: [doc, ...future],
  }
}

export function stepForward(state: HistoryState): Partial<HistoryState> {
  const { past, future, doc, changeBase } = state
  if (changeBase || future.length === 0) return {}
  return {
    doc: future[0],
    past: [...past, doc],
    future: future.slice(1),
  }
}
