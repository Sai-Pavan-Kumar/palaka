import { useEffect, useRef } from 'react'
import { useSessionStore } from '../engine/sessionStore'
import {
  applyHandPose,
  getGripTargetX,
  getGripY,
  getHandPose,
  type Spot,
} from './handPose'
import { HANDS, useHandSettings } from './handSettings'
import { HAND_TOOLS, isTapGesture } from './handTools'
import { playTap } from './tapAudio'
import './pointerHand.css'

// Per frame. The slow grip is what makes it feel like a held stick.
const GRIP_FOLLOW = 0.08
const PRESS_RELEASE = 0.18

type HandState = {
  pointer: Spot | null
  isHeld: boolean
  pressAmount: number
  pressedAt: number
  pressedSpot: Spot
}

function showTap(root: HTMLElement, spot: Spot) {
  const ripple = document.createElement('div')
  ripple.className = 'pointer-hand__ripple'
  ripple.style.left = `${spot.x}px`
  ripple.style.top = `${spot.y}px`
  ripple.addEventListener('animationend', () => ripple.remove())
  root.append(ripple)
  if (useHandSettings.getState().soundOn) playTap()
}

function isTap(state: HandState, spot: Spot | null) {
  if (!spot) return false
  const travel = Math.hypot(
    spot.x - state.pressedSpot.x,
    spot.y - state.pressedSpot.y,
  )
  return isTapGesture(performance.now() - state.pressedAt, travel)
}

function listenToPointer(root: HTMLElement, state: HandState) {
  const track = (event: PointerEvent) => {
    const rect = root.getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top
    const isInside = x >= 0 && y >= 0 && x <= rect.width && y <= rect.height
    // A held stroke keeps its hand, even past the board's edge.
    const isShown = isInside || state.isHeld
    state.pointer = isShown ? { x, y } : null
    root.classList.toggle('is-shown', isShown)
  }
  // A lifted finger has no position, so the hand must not hang around after it.
  const hideAfterTouch = (event: PointerEvent) => {
    if (event.pointerType !== 'touch') return
    state.pointer = null
    root.classList.remove('is-shown')
  }
  const press = (event: PointerEvent) => {
    track(event)
    if (!state.pointer) return
    // A press on a toolbar floating above the board is not a tap on the board.
    if (!root.parentElement?.contains(event.target as Node)) {
      hideAfterTouch(event)
      return
    }
    state.isHeld = true
    state.pressAmount = 1
    state.pressedAt = performance.now()
    state.pressedSpot = state.pointer
  }
  const release = (event: PointerEvent) => {
    if (!state.isHeld) return
    state.isHeld = false
    track(event)
    if (event.type === 'pointerup' && isTap(state, state.pointer)) {
      showTap(root, state.pressedSpot)
    }
    hideAfterTouch(event)
  }
  const events = [
    ['pointermove', track],
    ['pointerdown', press],
    ['pointerup', release],
    ['pointercancel', release],
  ] as const
  events.forEach(([name, run]) => window.addEventListener(name, run))
  return () => {
    root.classList.remove('is-shown')
    events.forEach(([name, run]) => window.removeEventListener(name, run))
  }
}

function runHandFrames(
  root: HTMLElement,
  arm: HTMLElement,
  hand: HTMLElement,
  rod: HTMLElement,
  state: HandState,
) {
  const follow = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ? 1
    : GRIP_FOLLOW
  let gripX: number | null = null
  let frame = requestAnimationFrame(function tick() {
    frame = requestAnimationFrame(tick)
    if (!state.pointer) return
    const art = HANDS[useHandSettings.getState().handId]
    const board = { width: root.clientWidth, height: root.clientHeight }
    const target = getGripTargetX(state.pointer.x, board)
    gripX = gripX === null ? target : gripX + (target - gripX) * follow
    if (!state.isHeld) state.pressAmount *= 1 - PRESS_RELEASE
    const grip = { x: gripX, y: getGripY(board) }
    const pose = getHandPose(state.pointer, grip, board, state.pressAmount, art)
    applyHandPose(arm, hand, rod, grip, pose, art)
  })
  return () => cancelAnimationFrame(frame)
}

// Lives inside the recorded board so the hand reaches the video. Styles are set
// directly each frame: a React render per pointer move would stall the drawing.
export function PointerHand() {
  const isToolActive = useSessionStore((s) => HAND_TOOLS.has(s.tool))
  const isOn = useHandSettings((s) => s.isOn)
  const isActive = isToolActive && isOn
  const rootRef = useRef<HTMLDivElement>(null)
  const armRef = useRef<HTMLDivElement>(null)
  const handRef = useRef<HTMLDivElement>(null)
  const rodRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const [root, arm, hand, rod] = [rootRef, armRef, handRef, rodRef].map(
      (ref) => ref.current,
    )
    if (!isActive || !root || !arm || !hand || !rod) return
    const state: HandState = {
      pointer: null,
      isHeld: false,
      pressAmount: 0,
      pressedAt: 0,
      pressedSpot: { x: 0, y: 0 },
    }
    const stopListening = listenToPointer(root, state)
    const stopFrames = runHandFrames(root, arm, hand, rod, state)
    return () => {
      stopListening()
      stopFrames()
    }
  }, [isActive])

  return (
    <div
      ref={rootRef}
      className={`pointer-hand ${isActive ? 'is-on' : ''}`}
      aria-hidden
    >
      <div ref={armRef} className="pointer-hand__arm">
        <div ref={rodRef} className="pointer-hand__part" />
        <div ref={handRef} className="pointer-hand__part" />
      </div>
    </div>
  )
}
