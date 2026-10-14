import {
  getDirectory,
  listImageFiles,
  readTextFile,
  type FolderFile,
} from '../../shared/fileSystem'
import {
  ASSETS_DIR,
  BOARD_FILE,
  parseBoard,
  type BoardFile,
} from './projectFiles'

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

export type LoadedFolder = {
  assets: FolderFile[]
  board: BoardFile | null
}

// Parse errors are thrown on purpose: the caller must stop before autosave
// can replace a damaged (or old tldraw) board with an empty one.
export async function loadProject(
  root: FileSystemDirectoryHandle,
): Promise<LoadedFolder> {
  const [assets, boardText] = await Promise.all([
    listProjectAssets(root),
    readTextFile(root, BOARD_FILE),
  ])
  return { assets, board: boardText ? parseBoard(boardText) : null }
}
