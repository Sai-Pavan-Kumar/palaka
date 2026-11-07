import { create } from 'zustand'
import gloveUrl from './hand-glove.png'
import lavenderUrl from './hand-lavender.png'
import robotUrl from './hand-robot.png'
import type { HandArt } from './handPose'

// Fractions measured from each 320x480 file; new art means measuring again.
export const HANDS = {
  lavender: {
    url: lavenderUrl,
    label: 'Lavender hand',
    aspect: 320 / 480,
    handTop: 0.06,
    tip: 0.079,
    tipX: 0.464,
    wrist: 0.448,
    rodX: 0.514,
    rodEnd: 0.9,
  },
  glove: {
    url: gloveUrl,
    label: 'White glove',
    aspect: 320 / 480,
    handTop: 0.08,
    tip: 0.096,
    tipX: 0.46,
    wrist: 0.455,
    rodX: 0.514,
    rodEnd: 0.9,
  },
  robot: {
    url: robotUrl,
    label: 'Robot hand',
    aspect: 320 / 480,
    handTop: 0.12,
    tip: 0.133,
    tipX: 0.397,
    wrist: 0.51,
    rodX: 0.5,
    rodEnd: 0.9,
  },
} satisfies Record<string, HandArt & { url: string; label: string }>

export type HandId = keyof typeof HANDS

type Saved = { isOn: boolean; soundOn: boolean; handId: HandId }

const STORAGE_KEY = 'palaka.pointerHand'
// Off by default: each tool keeps its own cursor until the hand is asked for.
const DEFAULTS: Saved = { isOn: false, soundOn: true, handId: 'lavender' }

// Storage can be blocked or hold an older shape; the hand must still work.
function loadSaved(): Saved {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}')
    const merged = { ...DEFAULTS, ...saved }
    return merged.handId in HANDS ? merged : DEFAULTS
  } catch {
    return DEFAULTS
  }
}

export const useHandSettings = create<Saved>(loadSaved)

export function updateHandSettings(change: Partial<Saved>) {
  useHandSettings.setState(change)
  try {
    const { isOn, soundOn, handId } = useHandSettings.getState()
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ isOn, soundOn, handId }))
  } catch {
    // Only a remembered preference is lost; this session still has it.
  }
}
