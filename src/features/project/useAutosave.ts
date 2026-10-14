import { useEffect } from 'react'
import { createDebouncedTask } from '../../shared/createDebouncedTask'
import { useEngineStore } from '../engine/engineStore'
import { useNotesStore } from '../notes/pageNotes'
import { useUiStore } from '../shell/uiStore'
import { saveBoardNow } from './boardPersistence'
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
      if (state.doc !== previous.doc) task.schedule()
    })
    const stopNotes = useNotesStore.subscribe(task.schedule)
    const saveNow = () => {
      task.schedule()
      void task.flush()
    }
    const saveOnHide = () => {
      if (document.visibilityState === 'hidden') saveNow()
    }
    document.addEventListener('visibilitychange', saveOnHide)
    return () => {
      stopDoc()
      stopNotes()
      document.removeEventListener('visibilitychange', saveOnHide)
      saveNow()
    }
  }, [])
}
