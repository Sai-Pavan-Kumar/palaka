import type { TLAssetStore } from 'tldraw'
import {
  getDirectory,
  getFileAtPath,
  makeUniqueFileName,
  writeFile,
} from '../../shared/fileSystem'
import { ASSETS_DIR } from './projectFiles'
import { listProjectAssets } from './openProject'
import { getProjectRoot, useProjectStore } from './projectStore'
import { useUiStore } from '../shell/uiStore'

// tldraw only accepts http, https, data and asset: sources, so folder paths are
// stored as "asset:assets/1-intro.png" and decoded back on load.
const FOLDER_SRC_PREFIX = 'asset:'
const objectUrlsByPath = new Map<string, Promise<string>>()
const folderPathByFile = new WeakMap<File, string>()

// Files picked from the left panel already live in the folder; remembering
// them stops tldraw's upload step from writing a duplicate copy.
export function rememberFolderFile(file: File, path: string): void {
  folderPathByFile.set(file, path)
}

function toFolderSrc(path: string): string {
  return FOLDER_SRC_PREFIX + encodeURI(path)
}

export function folderPathFromSrc(src: string): string | null {
  return src.startsWith(FOLDER_SRC_PREFIX)
    ? decodeURI(src.slice(FOLDER_SRC_PREFIX.length))
    : null
}

export function getObjectUrlForPath(path: string): Promise<string> {
  let url = objectUrlsByPath.get(path)
  if (!url) {
    url = getFileAtPath(getProjectRoot(), path).then((file) =>
      URL.createObjectURL(file),
    )
    // A failed read must not be cached forever; the file may come back.
    url.catch(() => objectUrlsByPath.delete(path))
    objectUrlsByPath.set(path, url)
  }
  return url
}

export function forgetObjectUrls(): void {
  for (const url of objectUrlsByPath.values()) {
    url.then(URL.revokeObjectURL, () => undefined)
  }
  objectUrlsByPath.clear()
}

async function saveIntoAssetsFolder(file: File): Promise<string> {
  const root = getProjectRoot()
  const assetsDir = await getDirectory(root, ASSETS_DIR, { create: true })
  const name = await makeUniqueFileName(assetsDir!, file.name || 'image.png')
  await writeFile(assetsDir!, name, file)
  useProjectStore.getState().setAssets(await listProjectAssets(root))
  return `${ASSETS_DIR}/${name}`
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

// With a folder open, board images are stored as paths inside the video
// folder, never as base64, so board.json stays small and the folder portable.
// Without a folder there is nowhere to put the file, so it is embedded.
export const folderAssetStore: TLAssetStore = {
  async upload(_asset, file) {
    if (!useProjectStore.getState().project) {
      return { src: await readAsDataUrl(file) }
    }
    try {
      const knownPath = folderPathByFile.get(file)
      return {
        src: toFolderSrc(knownPath ?? (await saveIntoAssetsFolder(file))),
      }
    } catch (error) {
      // tldraw reports upload failures in its own UI, which is hidden here.
      useUiStore
        .getState()
        .showToast(`Could not add ${file.name} to the folder.`, 'error')
      throw error
    }
  },
  resolve(asset) {
    const src = asset.props.src
    if (!src) return null
    const path = folderPathFromSrc(src)
    return path ? getObjectUrlForPath(path).catch(() => null) : src
  },
}
