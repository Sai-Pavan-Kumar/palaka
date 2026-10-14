import { useEffect } from 'react'
import { useValue } from 'tldraw'
import { BoardFrame } from '../board/BoardFrame'
import { useBoardStore } from '../board/boardStore'
import { TldrawBoard } from '../board/TldrawBoard'
import { NotesPanel } from '../notes/NotesPanel'
import { PageBar } from '../pages/PageBar'
import { allowFolderImageDrop, handleBoardDrop } from '../panel/addFolderImage'
import { LeftPanel } from '../panel/LeftPanel'
import { useAutosave } from '../project/useAutosave'
import { Countdown } from '../recorder/Countdown'
import { RecordingReadyCard } from '../recorder/RecordingReadyCard'
import { getRevealSession } from '../reveal/revealModel'
import { StyleBar } from '../tools/StyleBar'
import { TopBar } from '../tools/TopBar'
import { SaveStatus } from './SaveStatus'
import { Toast } from './Toast'
import { useGlobalShortcuts } from './useGlobalShortcuts'
import { useUiStore } from './uiStore'

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
  return () => setDrawing(true)
}

// Layout contract: BoardFrame is the only element recorded. All tool UI is
// rendered as its sibling, never as its child.
export function Workspace() {
  const editor = useBoardStore((s) => s.editor)
  const setBoardElement = useBoardStore((s) => s.setBoardElement)
  const isFocusMode = useUiStore((s) => s.isFocusMode)
  const isDrawing = useUiStore((s) => s.isDrawing)
  const isPresenting = useValue(
    'presenting',
    () => (editor ? getRevealSession(editor).presenting : false),
    [editor],
  )
  const startDrawingFade = useDrawingFade()
  useAutosave(editor)
  useGlobalShortcuts(editor)

  return (
    <main
      className={`shell stage ${isFocusMode ? 'is-focus' : ''} ${isDrawing ? 'is-drawing' : ''}`}
    >
      <BoardFrame
        ref={setBoardElement}
        isPresenting={isPresenting}
        onPointerDown={startDrawingFade}
        onDragOver={allowFolderImageDrop}
        onDropCapture={(event) => editor && handleBoardDrop(editor, event)}
      >
        <TldrawBoard />
      </BoardFrame>
      {editor && (
        <>
          <SaveStatus />
          <TopBar />
          <StyleBar />
          <LeftPanel />
          <NotesPanel />
          <PageBar />
        </>
      )}
      <Countdown />
      <RecordingReadyCard />
      <Toast />
    </main>
  )
}
