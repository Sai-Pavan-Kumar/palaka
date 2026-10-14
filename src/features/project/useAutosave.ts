import { useEffect } from 'react'
import { getSnapshot, type Editor } from 'tldraw'
import { createDebouncedTask } from '../../shared/createDebouncedTask'
import { writeFile } from '../../shared/fileSystem'
import { BOARD_FILE } from './projectFiles'
import { useProjectStore } from './projectStore'
import { useUiStore } from '../shell/uiStore'

// Long enough to batch a pen stroke's many small updates into one write,
// short enough that a crash loses at most a second or two of work.
const SAVE_DELAY_MS = 1500

// Writes board.json (pages, shapes, reveal steps and notes) into the folder.
// Refuses to write anything but the editor the folder was opened into.
export async function saveBoardNow(editor: Editor): Promise<void> {
  const { project, setSaveStatus } = useProjectStore.getState()
  if (!project || project.boundEditor !== editor) return
  setSaveStatus('saving')
  try {
    const { document } = getSnapshot(editor.store)
    await writeFile(project.root, BOARD_FILE, JSON.stringify(document))
    setSaveStatus('saved')
  } catch (error) {
    console.error('Autosave failed', error)
    setSaveStatus('error')
  }
}

// Only runs while a folder is open. Without one, tldraw's own browser
// storage (persistenceKey) keeps the board safe.
export function useAutosave(editor: Editor | null): void {
  const root = useProjectStore((s) => s.project?.root)
  const boundEditor = useProjectStore((s) => s.project?.boundEditor)

  useEffect(() => {
    if (!editor || !root) return
    // The board restarted under an open folder (it holds different content
    // now). Disconnect instead of saving, so the folder is never overwritten.
    if (editor !== boundEditor) {
      useProjectStore.getState().closeProject()
      useUiStore
        .getState()
        .showToast(
          'The board restarted, so the folder was disconnected. Open it again.',
          'error',
        )
      return
    }
    const boardTask = createDebouncedTask(
      () => saveBoardNow(editor),
      SAVE_DELAY_MS,
    )
    const stopListener = editor.store.listen(boardTask.schedule, {
      scope: 'document',
      source: 'user',
    })
    // tldraw delivers store events on the next animation frame, and hidden
    // tabs get no frames. So when the tab hides, save the board even if no
    // change event has arrived yet: the store itself is already up to date.
    const saveNow = () => {
      boardTask.schedule()
      void boardTask.flush()
    }
    const saveOnHide = () => {
      if (document.visibilityState === 'hidden') saveNow()
    }
    document.addEventListener('visibilitychange', saveOnHide)

    return () => {
      stopListener()
      document.removeEventListener('visibilitychange', saveOnHide)
      saveNow()
    }
  }, [editor, root, boundEditor])
}
