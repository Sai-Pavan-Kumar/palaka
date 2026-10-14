import { useEffect, useState } from 'react'
import { ImageOff } from 'lucide-react'
import type { FolderFile } from '../../shared/fileSystem'
import { useActiveEditor } from '../board/boardStore'
import { getObjectUrlForPath } from '../project/folderAssetStore'
import { useProjectStore } from '../project/projectStore'
import { addFolderImage, FOLDER_IMAGE_MIME } from './addFolderImage'

// A stable empty list: a fresh [] per render would make zustand re-render forever.
const NO_ASSETS: FolderFile[] = []

function AssetThumb({ image }: { image: FolderFile }) {
  const [url, setUrl] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let cancelled = false
    getObjectUrlForPath(image.path).then(
      (objectUrl) => !cancelled && setUrl(objectUrl),
      () => !cancelled && setFailed(true),
    )
    return () => {
      cancelled = true
    }
  }, [image.path])

  if (failed) return <ImageOff size={20} aria-label="Could not read file" />
  return url ? <img src={url} alt="" loading="lazy" draggable={false} /> : null
}

export function AssetGrid() {
  const editor = useActiveEditor()
  const assets = useProjectStore((s) => s.project?.assets ?? NO_ASSETS)
  const hasFolder = useProjectStore((s) => s.project !== null)

  if (!hasFolder) {
    return (
      <p className="left-panel__empty">
        Open a video folder (bottom-left) to see its images here. You can also
        paste or drop any image straight onto the board.
      </p>
    )
  }
  if (assets.length === 0) {
    return (
      <p className="left-panel__empty">
        No images in this folder yet. Put PNG, JPG, WebP or SVG files in it (or
        in its assets folder) and they show up here. Name them 1-intro.png,
        2-diagram.png to keep them in order.
      </p>
    )
  }

  return (
    <ul className="asset-grid">
      {assets.map((image) => (
        <li key={image.path}>
          <button
            type="button"
            className="asset-grid__item"
            title={`${image.name}: click to add, or drag onto the board`}
            draggable
            onDragStart={(event) => {
              event.dataTransfer.setData(FOLDER_IMAGE_MIME, image.path)
              event.dataTransfer.effectAllowed = 'copy'
            }}
            onClick={() => void addFolderImage(editor, image)}
          >
            <AssetThumb image={image} />
            <span className="asset-grid__name">{image.name}</span>
          </button>
        </li>
      ))}
    </ul>
  )
}
