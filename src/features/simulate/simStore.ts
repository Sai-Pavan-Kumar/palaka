import { create } from 'zustand'

// Live run settings only. Nothing here is saved: a simulation is a
// performance, the board is the document.
type SimState = {
  active: boolean
  playing: boolean
  // 1–10: multiplies how many requests the clients send.
  traffic: number
  // Bumped by Reset; the runner starts a fresh run when it changes.
  runId: number
}

export const MIN_TRAFFIC = 1
export const MAX_TRAFFIC = 10

export const useSimStore = create<SimState>(() => ({
  active: false,
  playing: true,
  traffic: 1,
  runId: 0,
}))

export function toggleSimulation(): void {
  const { active } = useSimStore.getState()
  useSimStore.setState({ active: !active, playing: true })
}

export function stopSimulation(): void {
  useSimStore.setState({ active: false })
}

export function togglePlaying(): void {
  useSimStore.setState((s) => ({ playing: !s.playing }))
}

export function setTraffic(traffic: number): void {
  const clamped = Math.min(MAX_TRAFFIC, Math.max(MIN_TRAFFIC, traffic))
  useSimStore.setState({ traffic: clamped })
}

export function resetSimulation(): void {
  useSimStore.setState((s) => ({ runId: s.runId + 1, playing: true }))
}
