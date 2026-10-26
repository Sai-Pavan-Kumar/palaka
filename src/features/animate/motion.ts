import type { AnimSpeed, Shape } from '../engine/model/types'

export type Motion = 'enter' | 'exit' | 'pulse'

// Seconds per motion at normal pace. Short on purpose: on video a slow fade
// reads as lag, not polish.
const BASE_SECONDS: Record<Motion, number> = {
  enter: 0.5,
  exit: 0.45,
  pulse: 0.7,
}

export const SLOWEST_PACE = 1.7

const SPEED_FACTOR: Record<AnimSpeed | 'normal', number> = {
  fast: 0.6,
  normal: 1,
  slow: SLOWEST_PACE,
}

export function speedFactor(shape: Shape): number {
  return SPEED_FACTOR[shape.animSpeed ?? 'normal']
}

export function motionSeconds(shape: Shape, motion: Motion): number {
  return BASE_SECONDS[motion] * speedFactor(shape)
}

// What the step being played right now does to this shape, if anything.
export function motionAt(shape: Shape, step: number | null): Motion | null {
  if (step === null) return null
  if (shape.revealStep === step) return 'enter'
  if (shape.exit?.step === step) return 'exit'
  if (shape.pulseStep === step) return 'pulse'
  return null
}

// On screen after `shown` steps. A shape whose exit step is still playing
// stays mounted so it can animate out; the step timer then removes it.
export function isShownAt(
  shape: Shape,
  shown: number,
  playingStep: number | null,
): boolean {
  if (shape.revealStep !== undefined && shape.revealStep > shown) return false
  const exitStep = shape.exit?.step
  if (exitStep === undefined || exitStep > shown) return true
  return exitStep === playingStep
}
