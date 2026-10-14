import type { DragEvent } from 'react'
import type { Editor, TLShapeId, VecLike } from 'tldraw'
import type { FolderFile } from '../../shared/fileSystem'
import { BOARD_BOUNDS } from '../board/boardCamera'
import { rememberFolderFile } from '../project/folderAssetStore'
import { useProjectStore } from '../project/projectStore'

export const FOLDER_IMAGE_MIME = 'application/x-surfboard-image-path'
// Big screenshots should land readable but never spill off the slide.
const MAX_SHARE_OF_BOARD = 0.8

function fitImagesInsideBoard(editor: Editor, shapeIds: TLShapeId[]): void {
  const maxW = BOARD_BOUNDS.w * MAX_SHARE_OF_BOARD
  const maxH = BOARD_BOUNDS.h * MAX_SHARE_OF_BOARD
  for (const id of shapeIds) {
    const shape = editor.getShape(id)
    if (
      shape?.type !== 'image' ||
      !('w' in shape.props) ||
      !('h' in shape.props)
    )
      continue
    const { w, h } = shape.props as { w: number; h: number }
    const scale = Math.min(1, maxW / w, maxH / h)
    if (scale === 1) continue
    const center = { x: shape.x + w / 2, y: shape.y + h / 2 }
    editor.updateShape({
      id,
      type: 'image',
      x: center.x - (w * scale) / 2,
      y: center.y - (h * scale) / 2,
      props: { w: w * scale, h: h * scale },
    })
  }
}

export async function addFolderImage(
  editor: Editor,
  image: FolderFile,
  point: VecLike = BOARD_BOUNDS.center,
): Promise<void> {
  const file = await image.handle.getFile()
  rememberFolderFile(file, image.path)
  const before = new Set(editor.getCurrentPageShapeIds())
  editor.markHistoryStoppingPoint('add image')
  await editor.putExternalContent({ type: 'files', files: [file], point })
  const created = [...editor.getCurrentPageShapeIds()].filter(
    (id) => !before.has(id),
  )
  fitImagesInsideBoard(editor, created)
  editor.focus()
}

// Panel thumbnails carry only a path; tldraw's own drop handler would ignore
// them, so the board intercepts this one data type.
export function handleBoardDrop(
  editor: Editor,
  event: DragEvent<HTMLDivElement>,
): void {
  const path = event.dataTransfer.getData(FOLDER_IMAGE_MIME)
  if (!path) return
  event.preventDefault()
  event.stopPropagation()
  const image = useProjectStore
    .getState()
    .project?.assets.find((a) => a.path === path)
  if (!image) return
  const point = editor.screenToPage({ x: event.clientX, y: event.clientY })
  void addFolderImage(editor, image, point)
}

export function allowFolderImageDrop(event: DragEvent<HTMLDivElement>): void {
  if (event.dataTransfer.types.includes(FOLDER_IMAGE_MIME))
    event.preventDefault()
}
