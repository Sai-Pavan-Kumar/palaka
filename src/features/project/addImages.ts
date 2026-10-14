import { useEngineStore } from '../engine/engineStore'
import { SLIDE_SIZE } from '../engine/model/boardSpec'
import { addAsset, addShape, updatePage } from '../engine/model/documentOps'
import { withRevealStep } from '../engine/model/revealSteps'
import type { ImageAsset, ImageShape, Point } from '../engine/model/types'
import {
  selectShapes,
  setSession,
  useSessionStore,
} from '../engine/sessionStore'
import { useUiStore } from '../shell/uiStore'
import { storeImageFile } from './folderAssetStore'

// Big screenshots should land readable but never spill off the slide.
const MAX_SHARE_OF_SLIDE = 0.8
// Several images dropped at once fan out instead of stacking exactly.
const CASCADE_OFFSET = 40

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

async function readImageSize(file: File): Promise<{ w: number; h: number }> {
  const bitmap = await createImageBitmap(file)
  const size = { w: bitmap.width, h: bitmap.height }
  bitmap.close()
  return size
}

async function prepareImage(file: File, center: Point, index: number) {
  const [src, size] = await Promise.all([
    storeImageFile(file),
    readImageSize(file),
  ])
  const { width, height } = SLIDE_SIZE[useEngineStore.getState().doc.aspect]
  const fit = Math.min(
    1,
    (width * MAX_SHARE_OF_SLIDE) / size.w,
    (height * MAX_SHARE_OF_SLIDE) / size.h,
  )
  const w = size.w * fit
  const h = size.h * fit
  const asset: ImageAsset = {
    id: crypto.randomUUID(),
    src,
    name: file.name,
    ...size,
  }
  const shape: ImageShape = {
    id: crypto.randomUUID(),
    type: 'image',
    assetId: asset.id,
    // Never past the slide edge: a half-hidden image is hard to grab and
    // looks like a mistake in the video.
    x: clamp(center.x - w / 2 + index * CASCADE_OFFSET, 0, width - w),
    y: clamp(center.y - h / 2 + index * CASCADE_OFFSET, 0, height - h),
    w,
    h,
    color: 'black',
    opacity: 1,
  }
  return { asset, shape }
}

function slideCenter(): Point {
  const { width, height } = SLIDE_SIZE[useEngineStore.getState().doc.aspect]
  return { x: width / 2, y: height / 2 }
}

// Paste, drop from the desktop and the folder panel all end here. All images
// from one action become one undo step and end up selected.
export async function addImageFiles(files: File[], center = slideCenter()) {
  const images = files.filter((file) => file.type.startsWith('image/'))
  if (images.length === 0) return
  try {
    const prepared = await Promise.all(
      images.map((file, index) => prepareImage(file, center, index)),
    )
    const { pageId, presenting } = useSessionStore.getState()
    useEngineStore.getState().commit((doc) => {
      const withAssets = prepared.reduce(
        (d, { asset }) => addAsset(d, asset),
        doc,
      )
      return updatePage(withAssets, pageId, (page) =>
        prepared.reduce(
          (p, { shape }) => addShape(p, withRevealStep(p, shape, presenting)),
          page,
        ),
      )
    })
    setSession({ tool: 'select' })
    selectShapes(prepared.map(({ shape }) => shape.id))
  } catch (error) {
    console.error('Adding image failed', error)
    useUiStore.getState().showToast('Could not add that image.', 'error')
  }
}
