import { create } from 'zustand'
import { runScript } from './engine/runScript'
import type { GitStep } from './engine/types'

type GitSimState = {
  steps: GitStep[]
  // Which step the board shows; 0 is the empty folder before any command.
  index: number
}

// Session only: the script is saved with the page, a run never is.
export const useGitSimStore = create<GitSimState>(() => ({
  steps: [],
  index: 0,
}))

export function isGitSimActive(): boolean {
  return useGitSimStore.getState().steps.length > 0
}

export function startGitSim(script: string): void {
  useGitSimStore.setState({ steps: runScript(script), index: 0 })
}

export function stepGitSim(delta: number): void {
  useGitSimStore.setState((s) => ({
    index: Math.min(Math.max(s.index + delta, 0), s.steps.length - 1),
  }))
}

export function stopGitSim(): void {
  useGitSimStore.setState({ steps: [], index: 0 })
}
