import { useEffect, useState } from 'react'
import {
  getObjectUrlForPath,
  isFolderPath,
} from '../../project/folderAssetStore'
import { useProjectStore } from '../../project/projectStore'
import type { ImageAsset } from '../model/types'

// Folder images are read from disk once and shown through object URLs.
// Data URLs (no folder) are used as they are.
export function useImageUrls(
  assets: Record<string, ImageAsset>,
): Record<string, string> {
  const root = useProjectStore((s) => s.project?.root)
  const [folderUrls, setFolderUrls] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!root) return
    let cancelled = false
    for (const asset of Object.values(assets)) {
      if (!isFolderPath(asset.src)) continue
      getObjectUrlForPath(asset.src).then(
        (url) => {
          if (!cancelled)
            setFolderUrls((urls) => ({ ...urls, [asset.id]: url }))
        },
        () => console.warn(`Image missing from folder: ${asset.src}`),
      )
    }
    return () => {
      cancelled = true
    }
  }, [assets, root])

  const urls: Record<string, string> = {}
  for (const asset of Object.values(assets)) {
    const url = isFolderPath(asset.src) ? folderUrls[asset.id] : asset.src
    if (url) urls[asset.id] = url
  }
  return urls
}
