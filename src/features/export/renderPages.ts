import type { Editor, TLPageId } from 'tldraw'
import { BOARD_BOUNDS, BOARD_HEIGHT, BOARD_WIDTH } from '../board/boardCamera'

export type RenderedPage = { name: string; png: Blob }

// toImage cannot render zero shapes, but an empty slide is still a slide.
async function blankPagePng(): Promise<Blob> {
  const canvas = new OffscreenCanvas(BOARD_WIDTH, BOARD_HEIGHT)
  const context = canvas.getContext('2d')!
  context.fillStyle = 'white'
  context.fillRect(0, 0, BOARD_WIDTH, BOARD_HEIGHT)
  return canvas.convertToBlob({ type: 'image/png' })
}

// Always the full 1920x1080 slide, never "fit to content", so every page and
// the video share one frame.
async function renderCurrentPagePng(editor: Editor): Promise<Blob> {
  const shapeIds = editor.getSortedChildIdsForParent(editor.getCurrentPageId())
  if (shapeIds.length === 0) return blankPagePng()
  const { blob } = await editor.toImage(shapeIds, {
    format: 'png',
    bounds: BOARD_BOUNDS,
    background: true,
    padding: 0,
    scale: 1,
    pixelRatio: 1,
  })
  return blob
}

// Pages render one at a time on screen; the original page comes back after.
export async function renderPages(
  editor: Editor,
  pageIds: TLPageId[],
): Promise<RenderedPage[]> {
  const startPageId = editor.getCurrentPageId()
  const rendered: RenderedPage[] = []
  try {
    for (const pageId of pageIds) {
      editor.setCurrentPage(pageId)
      rendered.push({
        name: editor.getPage(pageId)!.name,
        png: await renderCurrentPagePng(editor),
      })
    }
  } finally {
    editor.setCurrentPage(startPageId)
  }
  return rendered
}
