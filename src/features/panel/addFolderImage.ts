import type { DragEvent } from 'react'
import type { FolderFile } from '../../shared/fileSystem'
import { useEngineStore } from '../engine/engineStore'
import { SLIDE_SIZE } from '../engine/model/boardSpec'
import type { Point } from '../engine/model/types'
import { addImageFiles } from '../project/addImages'
import { rememberFolderFile } from '../project/folderAssetStore'
import { useProjectStore } from '../project/projectStore'

export const FOLDER_IMAGE_MIME = 'application/x-palaka-image-path'

export async function addFolderImage(
  image: FolderFile,
  center?: Point,
): Promise<void> {
  const file = await image.handle.getFile()
  rememberFolderFile(file, image.path)
  await addImageFiles([file], center)
}

// Where on the slide the drop happened, in board units.
function dropPoint(event: DragEvent<HTMLDivElement>): Point {
  const rect = event.currentTarget.getBoundingClientRect()
  const { width } = SLIDE_SIZE[useEngineStore.getState().doc.aspect]
  const unitsPerPixel = width / rect.width
  return {
    x: (event.clientX - rect.left) * unitsPerPixel,
    y: (event.clientY - rect.top) * unitsPerPixel,
  }
}

// Two kinds of drop land on the board: a thumbnail from the folder panel
// (carries only its path) and image files dragged in from the desktop.
export function handleBoardDrop(event: DragEvent<HTMLDivElement>): void {
  const path = event.dataTransfer.getData(FOLDER_IMAGE_MIME)
  const files = [...event.dataTransfer.files]
  if (!path && files.length === 0) return
  event.preventDefault()
  const point = dropPoint(event)
  if (!path) {
    void addImageFiles(files, point)
    return
  }
  const image = useProjectStore
    .getState()
    .project?.assets.find((a) => a.path === path)
  if (image) void addFolderImage(image, point)
}

export function allowBoardDrop(event: DragEvent<HTMLDivElement>): void {
  const types = event.dataTransfer.types
  if (types.includes(FOLDER_IMAGE_MIME) || types.includes('Files')) {
    event.preventDefault()
  }
}
