import { writeFile } from '../../shared/fileSystem'
import { useEngineStore } from '../engine/engineStore'
import { useNotesStore } from '../notes/pageNotes'
import {
  parkUnreadableBoard,
  readBrowserBoard,
  writeBrowserBoard,
} from './browserStorage'
import { BOARD_FILE, parseBoard, serializeBoard } from './projectFiles'
import { useProjectStore } from './projectStore'

// Until the browser copy has been read, saving would replace it with the
// empty start-up board. This stays false until loading has finished.
let isBrowserCopyLoaded = false

function currentBoardText(): string {
  return serializeBoard(
    useEngineStore.getState().doc,
    useNotesStore.getState().notes,
  )
}

async function saveToFolder(): Promise<void> {
  const { project, setSaveStatus } = useProjectStore.getState()
  // Only the board session the folder was opened into may write to it.
  if (
    !project ||
    project.boundSessionId !== useEngineStore.getState().sessionId
  ) {
    return
  }
  setSaveStatus('saving')
  try {
    await writeFile(project.root, BOARD_FILE, currentBoardText())
    setSaveStatus('saved')
  } catch (error) {
    console.error('Autosave to folder failed', error)
    setSaveStatus('error')
  }
}

async function saveToBrowser(): Promise<void> {
  if (!isBrowserCopyLoaded) return
  try {
    await writeBrowserBoard(currentBoardText())
  } catch (error) {
    console.error('Autosave to browser storage failed', error)
  }
}

// The folder when one is open, otherwise the browser's own storage.
export function saveBoardNow(): Promise<void> {
  return useProjectStore.getState().project ? saveToFolder() : saveToBrowser()
}

// Runs once at start-up, before the board is shown.
export async function loadBrowserBoard(): Promise<void> {
  try {
    const text = await readBrowserBoard()
    if (text) {
      try {
        const { document, notes } = parseBoard(text)
        useEngineStore.getState().replaceDocument(document)
        useNotesStore.getState().replaceNotes(notes)
      } catch (error) {
        console.error(
          'Browser copy unreadable; parked and starting fresh',
          error,
        )
        await parkUnreadableBoard(text)
      }
    }
    isBrowserCopyLoaded = true
  } catch (error) {
    // Storage blocked (private mode, policy): the board still works, it just
    // will not survive a refresh, and nothing is overwritten.
    console.error('Browser storage unavailable', error)
  }
}
