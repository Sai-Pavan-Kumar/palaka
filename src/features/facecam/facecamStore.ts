import { create } from 'zustand'
import { useUiStore } from '../shell/uiStore'

export type FacecamShape = 'circle' | 'rounded'
export type FacecamSize = 's' | 'm' | 'l'
export type FacecamEffect =
  'none' | 'studio-rim' | 'pulse' | 'subscribe-badge' | 'spinning-border'

export type BadgePlatform = 'youtube' | 'instagram'

export const FACECAM_SIZES: Record<FacecamSize, number> = {
  s: 180,
  m: 240,
  l: 320,
}

export const MIN_FACECAM_SIZE = 120
export const MAX_FACECAM_SIZE = 520

type FacecamState = {
  isEnabled: boolean
  stream: MediaStream | null
  pos: { x: number; y: number } | null
  shape: FacecamShape
  size: FacecamSize
  customSize: number
  effect: FacecamEffect
  bannerText: string
  badgePlatform: BadgePlatform
  mirrored: boolean
  error: string | null
  toggleCamera: () => Promise<void>
  setPos: (pos: { x: number; y: number }) => void
  setCustomSize: (size: number) => void
  cycleEffect: () => void
  setEffect: (effect: FacecamEffect) => void
  setBannerText: (text: string) => void
  toggleBadgePlatform: () => void
  setBadgePlatform: (platform: BadgePlatform) => void
  toggleMirrored: () => void
  cycleShape: () => void
  cycleSize: () => void
  closeCamera: () => void
}

export function describeCameraError(error: unknown): string {
  if (typeof DOMException !== 'undefined' && error instanceof DOMException) {
    if (error.name === 'NotAllowedError') {
      return 'Camera access was blocked. Allow camera in browser settings.'
    }
    if (
      error.name === 'NotFoundError' ||
      error.name === 'DevicesNotFoundError'
    ) {
      return 'No camera found on this device.'
    }
    if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
      return 'Camera is already in use by another application.'
    }
  }
  return (error as Error)?.message || 'Could not start camera.'
}

async function startMediaCamera(
  set: (s: Partial<FacecamState>) => void,
): Promise<void> {
  try {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error('Camera is not supported in this browser')
    }
    const media = await navigator.mediaDevices.getUserMedia({
      video: {
        width: { ideal: 640 },
        height: { ideal: 640 },
        facingMode: 'user',
      },
      audio: false,
    })
    set({ isEnabled: true, stream: media, error: null })
  } catch (err) {
    const msg = describeCameraError(err)
    set({ error: msg, isEnabled: false })
    useUiStore.getState().showToast(msg, 'error')
  }
}

function nextEffect(current: FacecamEffect): FacecamEffect {
  const effects: FacecamEffect[] = [
    'none',
    'studio-rim',
    'pulse',
    'subscribe-badge',
  ]
  const currentNormalized =
    current === 'spinning-border' ? 'studio-rim' : current
  const nextIdx = (effects.indexOf(currentNormalized) + 1) % effects.length
  return effects[nextIdx]
}

function nextPresetSize(current: FacecamSize): {
  size: FacecamSize
  customSize: number
} {
  const order: FacecamSize[] = ['s', 'm', 'l']
  const nextIdx = (order.indexOf(current) + 1) % order.length
  const sz = order[nextIdx]
  return { size: sz, customSize: FACECAM_SIZES[sz] }
}

export const useFacecamStore = create<FacecamState>((set, get) => ({
  isEnabled: false,
  stream: null,
  pos: null,
  shape: 'circle',
  size: 'm',
  customSize: FACECAM_SIZES.m,
  effect: 'none',
  bannerText: 'Subscribe',
  badgePlatform: 'youtube',
  mirrored: true,
  error: null,

  toggleCamera: async () => {
    const { isEnabled, stream } = get()
    if (isEnabled) {
      if (stream) stream.getTracks().forEach((track) => track.stop())
      set({ isEnabled: false, stream: null, error: null })
      return
    }
    await startMediaCamera(set)
  },

  setPos: (pos) => set({ pos }),
  setCustomSize: (size) =>
    set({
      customSize: Math.min(
        MAX_FACECAM_SIZE,
        Math.max(MIN_FACECAM_SIZE, Math.round(size)),
      ),
    }),
  cycleEffect: () => set((s) => ({ effect: nextEffect(s.effect) })),
  setEffect: (effect) => set({ effect }),
  setBannerText: (bannerText) => set({ bannerText }),
  toggleBadgePlatform: () =>
    set((s) => ({
      badgePlatform: s.badgePlatform === 'youtube' ? 'instagram' : 'youtube',
    })),
  setBadgePlatform: (badgePlatform) => set({ badgePlatform }),
  toggleMirrored: () => set((s) => ({ mirrored: !s.mirrored })),
  cycleShape: () =>
    set((s) => ({ shape: s.shape === 'circle' ? 'rounded' : 'circle' })),
  cycleSize: () => set((s) => nextPresetSize(s.size)),
  closeCamera: () => {
    const { stream } = get()
    if (stream) stream.getTracks().forEach((track) => track.stop())
    set({ isEnabled: false, stream: null, error: null })
  },
}))
