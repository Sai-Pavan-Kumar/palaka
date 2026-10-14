import {
  getDirectory,
  listImageFiles,
  readTextFile,
  type FolderFile,
} from '../../shared/fileSystem'
import {
  ASSETS_DIR,
  BOARD_FILE,
  PROJECT_FILE,
  createEmptyProject,
  parseBoard,
  parseProject,
} from './projectFiles'
import type { OpenProject } from './projectStore'

// Chrome remembers the last folder per picker id, so reopening a video folder
// starts in the right place without us storing any handle.
const PICKER_ID = 'surfboard-video-folder'

export function isFolderAccessSupported(): boolean {
  return typeof window.showDirectoryPicker === 'function'
}

export async function pickProjectFolder(): Promise<FileSystemDirectoryHandle | null> {
  try {
    return await window.showDirectoryPicker!({
      id: PICKER_ID,
      mode: 'readwrite',
    })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError')
      return null
    throw error
  }
}

// Images can sit in the folder root or in assets/; both show in the panel.
export async function listProjectAssets(
  root: FileSystemDirectoryHandle,
): Promise<FolderFile[]> {
  const assetsDir = await getDirectory(root, ASSETS_DIR, { create: false })
  const [rootImages, assetImages] = await Promise.all([
    listImageFiles(root),
    assetsDir ? listImageFiles(assetsDir, `${ASSETS_DIR}/`) : [],
  ])
  return [...rootImages, ...assetImages]
}

export async function loadProject(
  root: FileSystemDirectoryHandle,
): Promise<OpenProject> {
  const [assets, projectText, boardText] = await Promise.all([
    listProjectAssets(root),
    readTextFile(root, PROJECT_FILE),
    readTextFile(root, BOARD_FILE),
  ])
  // Parse errors are thrown on purpose: the caller must stop before autosave
  // can replace a damaged file with an empty board.
  const projectData = projectText
    ? parseProject(projectText)
    : createEmptyProject()
  return {
    root,
    folderName: root.name,
    assets,
    legacyNotes: projectData.notes,
    initialBoard: boardText ? parseBoard(boardText) : null,
  }
}
