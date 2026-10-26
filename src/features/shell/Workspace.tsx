import { useEffect, useState } from 'react'
import { isTypingTarget } from '../../shared/keyboard'
import { EngineStage } from '../engine/render/EngineStage'
import { useEngineShortcuts } from '../engine/useEngineShortcuts'
import { NotesPanel } from '../notes/NotesPanel'
import { PageBar } from '../pages/PageBar'
import { SimControls } from '../simulate/SimControls'
import { allowBoardDrop, handleBoardDrop } from '../panel/addFolderImage'
import { LeftPanel } from '../panel/LeftPanel'
import { addImageFiles } from '../project/addImages'
import { loadBrowserBoard } from '../project/boardPersistence'
import { useAutosave } from '../project/useAutosave'
import { Countdown } from '../recorder/Countdown'
import { RecordingReadyCard } from '../recorder/RecordingReadyCard'
import { StyleBar } from '../tools/StyleBar'
import { TopBar } from '../tools/TopBar'
import { BrandBadge } from './BrandBadge'
import { SaveStatus } from './SaveStatus'
import { Toast } from './Toast'
import { useGlobalShortcuts } from './useGlobalShortcuts'
import { useUiStore } from './uiStore'

// Fonts must be ready before text is measured, or selection boxes around
// text are sized for the fallback font.
const FONTS_TO_WAIT_FOR = [
  '500 48px "Overused Grotesk"',
  '400 48px "Geist Mono"',
]

function useBoardReady(): boolean {
  const [isReady, setIsReady] = useState(false)
  useEffect(() => {
    const fonts = Promise.all(
      FONTS_TO_WAIT_FOR.map((font) => document.fonts.load(font)),
    )
    void Promise.allSettled([fonts, loadBrowserBoard()]).then(() =>
      setIsReady(true),
    )
  }, [])
  return isReady
}

// Panels hide completely while the pen is down, and return on release.
function useDrawingFade() {
  const setDrawing = useUiStore((s) => s.setDrawing)
  useEffect(() => {
    const stop = () => setDrawing(false)
    window.addEventListener('pointerup', stop)
    window.addEventListener('pointercancel', stop)
    return () => {
      window.removeEventListener('pointerup', stop)
      window.removeEventListener('pointercancel', stop)
    }
  }, [setDrawing])
  // Pressing the board also closes the left panel, like any drawer: you
  // picked your image, now you are back to the board.
  return () => {
    setDrawing(true)
    useUiStore.setState({ isLeftPanelOpen: false })
  }
}

// Ctrl V with an image on the clipboard drops it onto the slide.
function usePasteImages() {
  useEffect(() => {
    const onPaste = (event: ClipboardEvent) => {
      if (isTypingTarget(event.target)) return
      const files = [...(event.clipboardData?.files ?? [])]
      if (files.length === 0) return
      event.preventDefault()
      void addImageFiles(files)
    }
    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  }, [])
}

function BoardChrome() {
  useAutosave()
  useGlobalShortcuts()
  useEngineShortcuts()
  usePasteImages()
  return (
    <>
      <BrandBadge />
      <SaveStatus />
      <TopBar />
      <StyleBar />
      <LeftPanel />
      <NotesPanel />
      <PageBar />
      <SimControls />
    </>
  )
}

// Layout contract: the board element inside EngineStage is the only element
// recorded. All tool UI is rendered as its sibling, never as its child.
export function Workspace() {
  const isReady = useBoardReady()
  const isFocusMode = useUiStore((s) => s.isFocusMode)
  const isDrawing = useUiStore((s) => s.isDrawing)
  const startDrawingFade = useDrawingFade()

  return (
    <main
      className={`shell stage ${isFocusMode ? 'is-focus' : ''} ${isDrawing ? 'is-drawing' : ''}`}
    >
      {isReady && (
        <>
          <EngineStage
            onPress={startDrawingFade}
            onDragOver={allowBoardDrop}
            onDrop={handleBoardDrop}
          />
          <BoardChrome />
        </>
      )}
      <Countdown />
      <RecordingReadyCard />
      <Toast />
    </main>
  )
}
