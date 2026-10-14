import { create } from 'zustand'
import type { QualityPreset } from './sessionRecorder'

export type RecorderStatus =
  'idle' | 'arming' | 'countdown' | 'recording' | 'paused' | 'saving'

// The last finished recording, shown in a card until the user closes it.
export type FinishedTake = {
  url: string
  fileName: string
  savedPath: string | null
}

type RecorderState = {
  status: RecorderStatus
  countdown: number
  quality: QualityPreset
  isMicOn: boolean
  // Elapsed time is stored as "banked" time plus the start of the current run,
  // so pausing never needs a ticking timer in state.
  bankedMs: number
  runningSince: number | null
  lastTake: FinishedTake | null
  setStatus: (status: RecorderStatus) => void
  setCountdown: (countdown: number) => void
  setQuality: (quality: QualityPreset) => void
  toggleMic: () => void
  markRunning: () => void
  markPaused: () => void
  reset: () => void
  showTake: (take: FinishedTake) => void
  closeTake: () => void
}

export const useRecorderStore = create<RecorderState>((set) => ({
  status: 'idle',
  countdown: 0,
  quality: 'balanced',
  isMicOn: true,
  bankedMs: 0,
  runningSince: null,
  lastTake: null,
  setStatus: (status) => set({ status }),
  setCountdown: (countdown) => set({ countdown }),
  setQuality: (quality) => set({ quality }),
  toggleMic: () => set((s) => ({ isMicOn: !s.isMicOn })),
  markRunning: () =>
    set({ status: 'recording', runningSince: performance.now() }),
  markPaused: () =>
    set((s) => ({
      status: 'paused',
      bankedMs:
        s.bankedMs + (s.runningSince ? performance.now() - s.runningSince : 0),
      runningSince: null,
    })),
  reset: () =>
    set({ status: 'idle', countdown: 0, bankedMs: 0, runningSince: null }),
  // The video lives in memory until its preview URL is released.
  showTake: (take) =>
    set((s) => {
      if (s.lastTake) URL.revokeObjectURL(s.lastTake.url)
      return { lastTake: take }
    }),
  closeTake: () =>
    set((s) => {
      if (s.lastTake) URL.revokeObjectURL(s.lastTake.url)
      return { lastTake: null }
    }),
}))

export function getElapsedMs(
  state: Pick<RecorderState, 'bankedMs' | 'runningSince'>,
): number {
  const running = state.runningSince
    ? performance.now() - state.runningSince
    : 0
  return state.bankedMs + running
}

export function isRecordingActive(status: RecorderStatus): boolean {
  return status !== 'idle'
}
