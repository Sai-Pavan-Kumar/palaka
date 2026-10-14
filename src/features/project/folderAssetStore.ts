import {
  getDirectory,
  getFileAtPath,
  makeUniqueFileName,
  writeFile,
} from '../../shared/fileSystem'
import { ASSETS_DIR } from './projectFiles'
import { listProjectAssets } from './openProject'
import { getProjectRoot, useProjectStore } from './projectStore'

// An image asset's src is either a data URL (no folder open) or a path inside
// the video folder such as "assets/1-intro.png".
const objectUrlsByPath = new Map<string, Promise<string>>()
const folderPathByFile = new WeakMap<File, string>()

export function isFolderPath(src: string): boolean {
  return !src.startsWith('data:')
}

// Files picked from the left panel already live in the folder; remembering
// them stops the add-image step from writing a duplicate copy.
export function rememberFolderFile(file: File, path: string): void {
  folderPathByFile.set(file, path)
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

export function readAsDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}

// With a folder open, board images are stored as paths inside the video
// folder, never as base64, so board.json stays small and the folder portable.
// Without a folder there is nowhere to put the file, so it is embedded.
export async function storeImageFile(file: File): Promise<string> {
  if (!useProjectStore.getState().project) return readAsDataUrl(file)
  return folderPathByFile.get(file) ?? (await saveIntoAssetsFolder(file))
}

// For exports: SVG drawn into a canvas cannot load outside URLs, so every
// image travels inside the SVG as a data URL.
export async function resolveAssetAsDataUrl(src: string): Promise<string> {
  if (!isFolderPath(src)) return src
  return readAsDataUrl(await getFileAtPath(getProjectRoot(), src))
}
