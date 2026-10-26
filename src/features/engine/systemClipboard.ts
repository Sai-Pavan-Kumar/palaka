import { getObjectUrlForPath, isFolderPath } from '../project/folderAssetStore'
import type { ImageAsset, Shape } from './model/types'

// Ctrl C on the board also writes a tag to the system clipboard. On paste,
// the tag says "the newest copy is ours"; anything else (a screenshot, an
// image copied in Chrome) is newer and wins. One rule, no double pastes.
const TAG = 'palaka-board-copy:'

let lastTag: string | null = null
// False when the browser refused the write (no focus, no permission):
// then a paste with nothing foreign on it falls back to our own copy.
let systemHasTag = false

async function toPng(asset: ImageAsset): Promise<Blob> {
  const url = isFolderPath(asset.src)
    ? await getObjectUrlForPath(asset.src)
    : asset.src
  const blob = await (await fetch(url)).blob()
  if (blob.type === 'image/png') return blob
  // The system clipboard only takes PNG, so JPEG/WebP/SVG are redrawn.
  const image = new Image()
  image.src = url
  await image.decode()
  const canvas = document.createElement('canvas')
  canvas.width = image.naturalWidth || asset.w
  canvas.height = image.naturalHeight || asset.h
  canvas.getContext('2d')?.drawImage(image, 0, 0, canvas.width, canvas.height)
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (png) => (png ? resolve(png) : reject(new Error('png'))),
      'image/png',
    ),
  )
}

async function write(items: Record<string, Blob | Promise<Blob>>) {
  await navigator.clipboard.write([new ClipboardItem(items)])
}

// A single copied image also goes out as a real PNG, so it pastes into
// Slack, Docs or Paint too. Blobs are passed as promises so the browser
// still counts the write as part of the key press.
export async function publishCopy(
  shapes: Shape[],
  assets: Record<string, ImageAsset>,
): Promise<void> {
  lastTag = `${TAG}${crypto.randomUUID()}`
  systemHasTag = false
  const text = new Blob([lastTag], { type: 'text/plain' })
  const only = shapes.length === 1 ? shapes[0] : null
  const asset = only?.type === 'image' ? assets[only.assetId] : undefined
  try {
    if (asset) await write({ 'text/plain': text, 'image/png': toPng(asset) })
    else await write({ 'text/plain': text })
    systemHasTag = true
  } catch {
    try {
      await write({ 'text/plain': text })
      systemHasTag = true
    } catch {
      // Clipboard blocked: the in-app copy still pastes (see pasteSource).
    }
  }
}

// Some browsers (and automation) fire no paste event for Ctrl V. The key
// press arms this fallback; a real paste event disarms it.
const PASTE_EVENT_WAIT_MS = 150
let pendingFallback: number | null = null

export function armPasteFallback(pasteBoard: () => void): void {
  if (!lastTag) return
  pendingFallback = window.setTimeout(() => {
    pendingFallback = null
    pasteBoard()
  }, PASTE_EVENT_WAIT_MS)
}

export function disarmPasteFallback(): void {
  if (pendingFallback !== null) window.clearTimeout(pendingFallback)
  pendingFallback = null
}

export type PasteSource = 'board' | 'files' | 'none'

// Decides what one paste means, read from the paste event itself.
export function pasteSource(data: DataTransfer | null): PasteSource {
  const text = data?.getData('text/plain') ?? ''
  const hasFiles = (data?.files.length ?? 0) > 0
  if (lastTag && text === lastTag) return 'board'
  if (hasFiles) return 'files'
  if (lastTag && !systemHasTag && !text) return 'board'
  return 'none'
}
