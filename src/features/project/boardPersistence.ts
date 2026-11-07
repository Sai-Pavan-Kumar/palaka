import { writeFile } from '../../shared/fileSystem'
import { useEngineStore } from '../engine/engineStore'
import { findPage } from '../engine/model/documentOps'
import { setSession, useSessionStore } from '../engine/sessionStore'
import { useUiStore } from '../shell/uiStore'
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
// What this tab last read or wrote. A stored copy that differs came from
// another tab. Compared as text because loading may tidy an old board.
let lastKnownText: string | null = null
let isApplying = false
let boardChannel: BroadcastChannel | null = null

const BOARD_CHANNEL = 'palaka-board'

// True while a saved board is being loaded, which is not an edit: saving it
// back would make two open tabs answer each other forever.
export function isApplyingSavedBoard(): boolean {
  return isApplying
}

function applySavedBoard(text: string): void {
  const { document, notes, sql } = parseBoard(text)
  isApplying = true
  try {
    useEngineStore.getState().replaceDocument(document)
    useNotesStore.getState().replaceNotes(notes, sql)
  } finally {
    isApplying = false
  }
  lastKnownText = text
}

// The page or shapes in hand may be gone from the newer board.
function keepSessionValid(): void {
  const { doc } = useEngineStore.getState()
  const { pageId, selectedIds } = useSessionStore.getState()
  const page = findPage(doc, pageId)
  setSession({
    pageId: page ? pageId : doc.pages[0].id,
    selectedIds: page ? selectedIds.filter((id) => page.shapes[id]) : [],
  })
}

function isBusyEditing(): boolean {
  return (
    useEngineStore.getState().changeBase !== null ||
    useSessionStore.getState().editingTextId !== null
  )
}

export async function syncFromOtherTab(): Promise<void> {
  if (!isBrowserCopyLoaded || useProjectStore.getState().project) return
  try {
    const text = await readBrowserBoard()
    if (!text || text === lastKnownText || isBusyEditing()) return
    applySavedBoard(text)
    keepSessionValid()
    useUiStore.getState().showToast('Updated with changes from another tab')
  } catch (error) {
    console.error('Could not read the board saved by another tab', error)
  }
}

export function openBoardChannel(
  onOtherTabSaved: () => void,
): BroadcastChannel | null {
  if (typeof BroadcastChannel === 'undefined') return null
  const channel = new BroadcastChannel(BOARD_CHANNEL)
  channel.onmessage = onOtherTabSaved
  boardChannel = channel
  return channel
}

export function currentBoardText(): string {
  return serializeBoard(
    useEngineStore.getState().doc,
    useNotesStore.getState().notes,
    useNotesStore.getState().sql,
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
    const text = currentBoardText()
    lastKnownText = text
    await writeBrowserBoard(text)
    boardChannel?.postMessage('saved')
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
        applySavedBoard(text)
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
