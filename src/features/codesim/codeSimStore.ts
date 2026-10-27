import { create } from 'zustand'
import type { PyValue, TraceError, TraceStep } from './run/traceTypes'

// loading = Python is downloading/booting; running = the code itself runs.
export type CodeSimStatus = 'idle' | 'loading' | 'running' | 'ready' | 'error'

type CodeSimState = {
  status: CodeSimStatus
  cardId: string | null
  // What the steps were computed from (code + Run with line).
  runKey: string | null
  steps: TraceStep[]
  index: number
  error: TraceError | null
  result: PyValue | null
}

// Session only: a run is never saved or undone, only the card's code is.
export const useCodeSimStore = create<CodeSimState>(() => ({
  status: 'idle',
  cardId: null,
  runKey: null,
  steps: [],
  index: 0,
  error: null,
  result: null,
}))

export function isCodeSimActive(): boolean {
  return useCodeSimStore.getState().steps.length > 0
}

export function stepCodeSim(delta: number): void {
  useCodeSimStore.setState((s) => ({
    index: Math.min(Math.max(s.index + delta, 0), s.steps.length - 1),
  }))
}

export function jumpCodeSim(to: 'start' | 'end'): void {
  useCodeSimStore.setState((s) => ({
    index: to === 'start' ? 0 : Math.max(s.steps.length - 1, 0),
  }))
}

export function stopCodeSim(): void {
  useCodeSimStore.setState({
    status: 'idle',
    cardId: null,
    runKey: null,
    steps: [],
    index: 0,
    error: null,
    result: null,
  })
}
