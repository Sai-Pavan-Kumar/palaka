import { useEffect } from 'react'
import { createDebouncedTask } from '../../shared/createDebouncedTask'
import { useEngineStore } from '../engine/engineStore'
import { useNotesStore } from '../notes/pageNotes'
import { useUiStore } from '../shell/uiStore'
import {
  isApplyingSavedBoard,
  openBoardChannel,
  saveBoardNow,
  syncFromOtherTab,
} from './boardPersistence'
import { useProjectStore } from './projectStore'

// Long enough to batch a pen stroke's many small updates into one write,
// short enough that a crash loses at most a second or two of work.
const SAVE_DELAY_MS = 1500

// A folder opened by an earlier board session (before a hot reload) belongs
// to a board that no longer exists. Disconnect it instead of saving.
function disconnectStaleFolder(): boolean {
  const { project, closeProject } = useProjectStore.getState()
  if (!project) return false
  if (project.boundSessionId === useEngineStore.getState().sessionId)
    return false
  closeProject()
  useUiStore
    .getState()
    .showToast(
      'The board restarted, so the folder was disconnected. Open it again.',
      'error',
    )
  return true
}

// Saves after every change (board or notes) and when the tab hides, to the
// folder when one is open and to browser storage otherwise.
export function useAutosave(): void {
  useEffect(() => {
    disconnectStaleFolder()
    const task = createDebouncedTask(saveBoardNow, SAVE_DELAY_MS)
    const stopDoc = useEngineStore.subscribe((state, previous) => {
      if (state.doc !== previous.doc && !isApplyingSavedBoard()) task.schedule()
    })
    const stopNotes = useNotesStore.subscribe(() => {
      if (!isApplyingSavedBoard()) task.schedule()
    })
    // Unsaved edits here win; a clean tab always takes the newer saved board.
    const pullNewerBoard = () => {
      if (!task.hasPending()) void syncFromOtherTab()
    }
    // Only flushes: a tab with no edits must never write, or simply hiding an
    // old tab would replace the board with its stale copy.
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') void task.flush()
      else pullNewerBoard()
    }
    const channel = openBoardChannel(pullNewerBoard)
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('focus', pullNewerBoard)
    return () => {
      stopDoc()
      stopNotes()
      channel?.close()
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('focus', pullNewerBoard)
      void task.flush()
    }
  }, [])
}
