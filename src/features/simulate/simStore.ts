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
  // Step mode: one request at a time, frozen at every block.
  stepMode: boolean
  // Bumped by "Send" and "Next"; the runner reacts to each change.
  sendId: number
  nextId: number
  // Blocks taken down by the teacher.
  down: string[]
}

export const MIN_TRAFFIC = 1
export const MAX_TRAFFIC = 10

export const useSimStore = create<SimState>(() => ({
  active: false,
  playing: true,
  traffic: 1,
  runId: 0,
  stepMode: false,
  sendId: 0,
  nextId: 0,
  down: [],
}))

export function toggleSimulation(): void {
  const { active } = useSimStore.getState()
  useSimStore.setState({ active: !active, playing: true, down: [] })
}

export function stopSimulation(): void {
  useSimStore.setState({ active: false, down: [] })
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

export function setStepMode(stepMode: boolean): void {
  useSimStore.setState({ stepMode, playing: true })
}

export function sendOneRequest(): void {
  useSimStore.setState((s) => ({ sendId: s.sendId + 1 }))
}

export function nextStep(): void {
  useSimStore.setState((s) => ({ nextId: s.nextId + 1 }))
}

// Down if any of them is up, else bring them all back: one button, no
// guessing which state a mixed selection ends in.
export function toggleDown(ids: string[]): void {
  const { down } = useSimStore.getState()
  const allDown = ids.every((id) => down.includes(id))
  useSimStore.setState({
    down: allDown
      ? down.filter((id) => !ids.includes(id))
      : [...new Set([...down, ...ids])],
  })
}
