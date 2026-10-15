import { create } from 'zustand'

export type FacecamShape = 'circle' | 'rounded'
export type FacecamSize = 's' | 'm' | 'l'

export const FACECAM_SIZES: Record<FacecamSize, number> = {
  s: 180,
  m: 240,
  l: 320,
}

type FacecamState = {
  isEnabled: boolean
  stream: MediaStream | null
  pos: { x: number; y: number } | null
  shape: FacecamShape
  size: FacecamSize
  mirrored: boolean
  error: string | null
  toggleCamera: () => Promise<void>
  setPos: (pos: { x: number; y: number }) => void
  toggleMirrored: () => void
  cycleShape: () => void
  cycleSize: () => void
  closeCamera: () => void
}

export const useFacecamStore = create<FacecamState>((set, get) => ({
  isEnabled: false,
  stream: null,
  pos: null,
  shape: 'circle',
  size: 'm',
  mirrored: true,
  error: null,

  toggleCamera: async () => {
    const { isEnabled, stream } = get()
    if (isEnabled) {
      if (stream) stream.getTracks().forEach((track) => track.stop())
      set({ isEnabled: false, stream: null, error: null })
      return
    }

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
      set({ error: (err as Error).message, isEnabled: false })
    }
  },

  setPos: (pos) => set({ pos }),
  toggleMirrored: () => set((s) => ({ mirrored: !s.mirrored })),
  cycleShape: () =>
    set((s) => ({ shape: s.shape === 'circle' ? 'rounded' : 'circle' })),
  cycleSize: () =>
    set((s) => {
      const order: FacecamSize[] = ['s', 'm', 'l']
      const nextIdx = (order.indexOf(s.size) + 1) % order.length
      return { size: order[nextIdx] }
    }),
  closeCamera: () => {
    const { stream } = get()
    if (stream) stream.getTracks().forEach((track) => track.stop())
    set({ isEnabled: false, stream: null, error: null })
  },
}))
