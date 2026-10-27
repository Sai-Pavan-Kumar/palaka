import { useEffect } from 'react'
import {
  isCodeSimActive,
  stepCodeSim,
  stopCodeSim,
} from '../codesim/codeSimStore'
import { handlePresentCodeKey } from '../codesim/presentCodeSim'
import { nextStep, stopSimulation, useSimStore } from '../simulate/simStore'
import { hasModifier, isTypingTarget } from '../../shared/keyboard'
import {
  setCameraFrame,
  toggleCameraFrame,
  useSessionStore,
} from '../engine/sessionStore'
import { goToPageOffset } from '../pages/pageActions'
import { useRecorderStore } from '../recorder/recorderStore'
import { setPresenting, stepReveal } from '../reveal/revealModel'
import { useUiStore } from './uiStore'

const NEXT_STEP_KEYS = new Set([' ', 'ArrowRight'])
const PREVIOUS_STEP_KEYS = new Set(['ArrowLeft'])

function handlePresentingKey(event: KeyboardEvent, isRecording: boolean) {
  if (event.key === 'Tab') {
    toggleCameraFrame()
    return true
  }
  if (event.key.toLowerCase() === 'g') {
    useUiStore.getState().toggleUpcoming()
    return true
  }
  if (event.shiftKey && event.key === 'ArrowRight') {
    setCameraFrame(1)
    return true
  }
  if (event.shiftKey && event.key === 'ArrowLeft') {
    setCameraFrame(0)
    return true
  }
  if (NEXT_STEP_KEYS.has(event.key)) stepReveal(1)
  else if (PREVIOUS_STEP_KEYS.has(event.key)) stepReveal(-1)
  else if (event.key === 'Escape' && !isRecording) setPresenting(false)
  else return false
  return true
}

// Presenting: a switched-on code card takes Space (and the arrows) until
// its last line, then the same key moves the reveal on. Shift+Space walks
// back the same way, stepping the reveal back once the code is at line one.
function handlePresentCodeSimKey(event: KeyboardEvent): boolean {
  const back =
    event.key === 'ArrowLeft' || (event.key === ' ' && event.shiftKey)
  const next =
    event.key === 'ArrowRight' || (event.key === ' ' && !event.shiftKey)
  if (back) {
    if (handlePresentCodeKey(-1)) return true
    if (event.key !== ' ') return false
    stepReveal(-1)
    return true
  }
  return next && handlePresentCodeKey(1)
}

// Editing: once a run is open, Space walks its lines. Arrows stay with the
// board there, so they still nudge shapes.
function handleCodeSimKey(event: KeyboardEvent, presenting: boolean): boolean {
  if (presenting) return handlePresentCodeSimKey(event)
  if (!isCodeSimActive()) return false
  if (event.key === ' ') stepCodeSim(event.shiftKey ? -1 : 1)
  else if (event.key === 'Escape') stopCodeSim()
  else return false
  return true
}

// Returns true when the key was ours.
function handleKey(event: KeyboardEvent): boolean {
  const ui = useUiStore.getState()
  const isRecording = useRecorderStore.getState().status !== 'idle'
  const { presenting } = useSessionStore.getState()
  const key = event.key.toLowerCase()
  if (handleCodeSimKey(event, presenting)) return true

  // Esc leaves the simulation first, then presenting on the next press.
  const sim = useSimStore.getState()
  if (event.key === 'Escape' && sim.active) {
    stopSimulation()
  } else if (key === 'n' && sim.active && sim.stepMode) {
    nextStep()
  } else if (key === 'f') ui.toggleFocusMode()
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
      if (useSessionStore.getState().presenting || isCodeSimActive()) {
        event.preventDefault()
      }
    }
    window.addEventListener('keydown', onKeyDown, { capture: true })
    window.addEventListener('keyup', onKeyUp, { capture: true })
    return () => {
      window.removeEventListener('keydown', onKeyDown, { capture: true })
      window.removeEventListener('keyup', onKeyUp, { capture: true })
    }
  }, [])
}
