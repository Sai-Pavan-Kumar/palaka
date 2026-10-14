import { useEffect } from 'react'
import type { Editor } from 'tldraw'
import { hasModifier, isTypingTarget } from '../../shared/keyboard'
import { goToPageOffset } from '../pages/pageActions'
import { useRecorderStore } from '../recorder/recorderStore'
import {
  getRevealSession,
  setPresenting,
  stepReveal,
} from '../reveal/revealModel'
import { useUiStore } from './uiStore'

const NEXT_STEP_KEYS = new Set([' ', 'ArrowRight'])
const PREVIOUS_STEP_KEYS = new Set(['ArrowLeft'])

// Returns true when the key was ours. Runs in the capture phase on window,
// before tldraw's own listeners: F would otherwise pick tldraw's frame tool,
// and Space/arrows would pan the camera or nudge shapes.
function handleKey(editor: Editor, event: KeyboardEvent): boolean {
  const ui = useUiStore.getState()
  const isRecording = useRecorderStore.getState().status !== 'idle'
  const { presenting } = getRevealSession(editor)

  if (event.key === 'f' || event.key === 'F') {
    ui.toggleFocusMode()
    return true
  }
  if ((event.key === 'p' || event.key === 'P') && !isRecording) {
    setPresenting(editor, !presenting)
    return true
  }
  if (event.key === 'PageDown' || event.key === 'PageUp') {
    goToPageOffset(editor, event.key === 'PageDown' ? 1 : -1)
    return true
  }
  if (event.key === 'Escape' && ui.isFocusMode) {
    ui.setFocusMode(false)
    return true
  }
  if (!presenting) return false
  if (NEXT_STEP_KEYS.has(event.key)) {
    stepReveal(editor, 1)
    return true
  }
  if (PREVIOUS_STEP_KEYS.has(event.key)) {
    stepReveal(editor, -1)
    return true
  }
  if (event.key === 'Escape' && !isRecording) {
    setPresenting(editor, false)
    return true
  }
  return false
}

export function useGlobalShortcuts(editor: Editor | null): void {
  useEffect(() => {
    if (!editor) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (hasModifier(event) || isTypingTarget(event.target)) return
      if (editor.getEditingShapeId() !== null) return
      if (!handleKey(editor, event)) return
      event.preventDefault()
      event.stopPropagation()
    }
    // tldraw treats a held Space as "hand tool"; swallow its key-up too while
    // presenting so the tool never flips.
    const onKeyUp = (event: KeyboardEvent) => {
      if (event.key === ' ' && getRevealSession(editor).presenting)
        event.stopPropagation()
    }
    window.addEventListener('keydown', onKeyDown, { capture: true })
    window.addEventListener('keyup', onKeyUp, { capture: true })
    return () => {
      window.removeEventListener('keydown', onKeyDown, { capture: true })
      window.removeEventListener('keyup', onKeyUp, { capture: true })
    }
  }, [editor])
}
