import { useCallback } from 'react'
import { Tldraw, type Editor } from 'tldraw'
import { getAssetUrlsByImport } from '@tldraw/assets/imports.vite'
import 'tldraw/tldraw.css'
import { registerShapeCleanup } from '../cleanup/registerShapeCleanup'
import { folderAssetStore } from '../project/folderAssetStore'
import { getRevealVisibility, withRevealStep } from '../reveal/revealModel'
import { BOARD_CAMERA_OPTIONS } from './boardCamera'
import { BOARD_THEMES } from './boardTheme'
import { useBoardStore } from './boardStore'

// Self-hosted so the app works offline and makes no CDN calls.
const ASSET_URLS = getAssetUrlsByImport()

// The board opens ready to draw, before any folder is chosen. tldraw keeps it
// in the browser's own storage under this key, so a refresh loses nothing.
// Kept from before the Palaka rename: changing it would hide boards already
// saved in the browser.
const BROWSER_BOARD_KEY = 'surfboard-whiteboard'

// The only file that talks to tldraw's React API. Keeping the engine behind
// this wrapper keeps a future engine switch contained.
export function TldrawBoard() {
  const setEditor = useBoardStore((s) => s.setEditor)

  const handleMount = useCallback(
    (editor: Editor) => {
      // Picked tools stay picked: draw ten arrows without re-clicking Arrow.
      editor.updateInstanceState({ isToolLocked: true })
      const stopReveal = editor.sideEffects.registerBeforeCreateHandler(
        'shape',
        (shape) => withRevealStep(editor, shape),
      )
      const stopCleanup = registerShapeCleanup(editor)
      setEditor(editor)
      return () => {
        stopReveal()
        stopCleanup()
        setEditor(null)
      }
    },
    [setEditor],
  )

  return (
    <Tldraw
      hideUi
      persistenceKey={BROWSER_BOARD_KEY}
      assetUrls={ASSET_URLS}
      themes={BOARD_THEMES}
      colorScheme="light"
      cameraOptions={BOARD_CAMERA_OPTIONS}
      getShapeVisibility={getRevealVisibility}
      assets={folderAssetStore}
      onMount={handleMount}
    />
  )
}
