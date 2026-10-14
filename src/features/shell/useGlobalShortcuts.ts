import { useEffect } from 'react'
import { hasModifier, isTypingTarget } from '../../shared/keyboard'
import { useSessionStore } from '../engine/sessionStore'
import { goToPageOffset } from '../pages/pageActions'
import { useRecorderStore } from '../recorder/recorderStore'
import { setPresenting, stepReveal } from '../reveal/revealModel'
import { useUiStore } from './uiStore'

const NEXT_STEP_KEYS = new Set([' ', 'ArrowRight'])
const PREVIOUS_STEP_KEYS = new Set(['ArrowLeft'])

function handlePresentingKey(event: KeyboardEvent, isRecording: boolean) {
  if (NEXT_STEP_KEYS.has(event.key)) stepReveal(1)
  else if (PREVIOUS_STEP_KEYS.has(event.key)) stepReveal(-1)
  else if (event.key === 'Escape' && !isRecording) setPresenting(false)
  else return false
  return true
}

// Returns true when the key was ours.
function handleKey(event: KeyboardEvent): boolean {
  const ui = useUiStore.getState()
  const isRecording = useRecorderStore.getState().status !== 'idle'
  const { presenting } = useSessionStore.getState()
  const key = event.key.toLowerCase()

  if (key === 'f') ui.toggleFocusMode()
  else if (key === 'p' && !isRecording) setPresenting(!presenting)
  else if (event.key === 'PageDown') goToPageOffset(1)
  else if (event.key === 'PageUp') goToPageOffset(-1)
  else if (event.key === 'Escape' && ui.isFocusMode) ui.setFocusMode(false)
  else return presenting && handlePresentingKey(event, isRecording)
  return true
}

// Runs in the capture phase, before the board's own keys, so Esc leaves
// focus mode before it clears a selection, and Space steps instead of typing.
export function useGlobalShortcuts(): void {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (hasModifier(event) || isTypingTarget(event.target)) return
      if (!handleKey(event)) return
      event.preventDefault()
    }
    // Buttons "click" on Space release. While presenting, Space means next
    // step, so its release must never press Present, Pause or Stop.
    const onKeyUp = (event: KeyboardEvent) => {
      if (event.key !== ' ' || isTypingTarget(event.target)) return
      if (useSessionStore.getState().presenting) event.preventDefault()
    }
    window.addEventListener('keydown', onKeyDown, { capture: true })
    window.addEventListener('keyup', onKeyUp, { capture: true })
    return () => {
      window.removeEventListener('keydown', onKeyDown, { capture: true })
      window.removeEventListener('keyup', onKeyUp, { capture: true })
    }
  }, [])
}
