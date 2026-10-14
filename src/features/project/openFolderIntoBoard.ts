import { loadSnapshot, type Editor } from 'tldraw'
import { importLegacyNotes } from '../notes/pageNotes'
import { forgetObjectUrls } from './folderAssetStore'
import { loadProject, pickProjectFolder } from './openProject'
import { useProjectStore } from './projectStore'
import { saveBoardNow } from './useAutosave'

const COPY_QUESTION =
  'This folder has no board yet.\n\nOK = copy the board you are working on into this folder.\nCancel = start this folder with an empty board.'

function hasAnyContent(editor: Editor): boolean {
  return editor
    .getPages()
    .some((page) => editor.getSortedChildIdsForParent(page.id).length > 0)
}

function clearBoard(editor: Editor): void {
  editor.run(
    () => {
      const [firstPage, ...otherPages] = editor.getPages()
      editor.setCurrentPage(firstPage.id)
      otherPages.forEach((page) => editor.deletePage(page.id))
      editor.deleteShapes([...editor.getCurrentPageShapeIds()])
      editor.deleteAssets(editor.getAssets().map((asset) => asset.id))
      editor.updatePage({ id: firstPage.id, name: 'Page 1', meta: {} })
    },
    { history: 'ignore' },
  )
}

// Returns false when the user cancelled the picker. Throws if the folder's
// files are damaged, before anything is written, so nothing gets overwritten.
export async function openFolderIntoBoard(editor: Editor): Promise<boolean> {
  const root = await pickProjectFolder()
  if (!root) return false
  const project = await loadProject(root)
  // Finish writing the current folder, then disconnect it, before the board
  // changes, so one folder's content can never be saved into another.
  await saveBoardNow(editor)
  useProjectStore.getState().closeProject()
  forgetObjectUrls()

  if (project.initialBoard) {
    loadSnapshot(editor.store, project.initialBoard)
  } else if (hasAnyContent(editor) && !window.confirm(COPY_QUESTION)) {
    clearBoard(editor)
  }
  importLegacyNotes(editor, project.legacyNotes)
  editor.clearHistory()
  useProjectStore.getState().setProject({ ...project, boundEditor: editor })
  await saveBoardNow(editor)
  return true
}
