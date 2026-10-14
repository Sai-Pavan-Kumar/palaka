import { create } from 'zustand'

export type LaserPoint = { x: number; y: number; time: number }

// How long a laser mark stays visible. Long enough to follow a sentence,
// short enough that the board is clean again before the next point.
export const LASER_FADE_MS = 700

type LaserState = {
  points: LaserPoint[]
  addPoints: (points: { x: number; y: number }[]) => void
  prune: (now: number) => void
}

// The laser is pure presentation: it lives inside the board (so the video
// shows it) but never touches the document or undo history.
export const useLaserStore = create<LaserState>((set, get) => ({
  points: [],
  addPoints: (points) => {
    const time = performance.now()
    set({ points: [...get().points, ...points.map((p) => ({ ...p, time }))] })
  },
  prune: (now) => {
    const points = get().points
    const fresh = points.filter((p) => now - p.time < LASER_FADE_MS)
    if (fresh.length !== points.length) set({ points: fresh })
  },
}))
