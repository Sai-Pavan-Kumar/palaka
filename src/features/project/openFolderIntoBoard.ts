import { useEngineStore } from '../engine/engineStore'
import {
  createEmptyDocument,
  getOrderedShapes,
} from '../engine/model/documentOps'
import { finishTextEditing } from '../engine/textEditing'
import { useNotesStore } from '../notes/pageNotes'
import { saveBoardNow } from './boardPersistence'
import { forgetObjectUrls } from './folderAssetStore'
import { loadProject, pickProjectFolder } from './openProject'
import { useProjectStore } from './projectStore'

const COPY_QUESTION =
  'This folder has no board yet.\n\nOK = copy the board you are working on into this folder.\nCancel = start this folder with an empty board.'

function hasAnyContent(): boolean {
  return useEngineStore
    .getState()
    .doc.pages.some((page) => getOrderedShapes(page).length > 0)
}

// Returns false when the user cancelled the picker. Throws if the folder's
// board is damaged or from the old version, before anything is written.
export async function openFolderIntoBoard(): Promise<boolean> {
  const root = await pickProjectFolder()
  if (!root) return false
  const { assets, board } = await loadProject(root)
  // Finish writing where the board lives now, then disconnect it, before the
  // board changes, so one folder's content can never be saved into another.
  finishTextEditing()
  await saveBoardNow()
  useProjectStore.getState().closeProject()
  forgetObjectUrls()

  const engine = useEngineStore.getState()
  if (board) {
    engine.replaceDocument(board.document)
    useNotesStore.getState().replaceNotes(board.notes, board.sql)
  } else if (hasAnyContent() && !window.confirm(COPY_QUESTION)) {
    engine.replaceDocument(createEmptyDocument(engine.doc.aspect))
    useNotesStore.getState().replaceNotes({})
  } else {
    // Copying keeps the content but starts a clean undo history, so Ctrl Z
    // can't reach back into the previous location's edits.
    engine.replaceDocument(engine.doc)
  }
  useProjectStore.getState().setProject({
    root,
    folderName: root.name,
    assets,
    boundSessionId: engine.sessionId,
  })
  await saveBoardNow()
  return true
}
