import type { EngineTool } from '../engine/sessionStore'

export const HAND_TOOLS: ReadonlySet<EngineTool> = new Set([
  'pen',
  'highlighter',
  'laser',
])

// Longer or further than this is not a tap, so it stays silent.
const TAP_MAX_MS = 250
const TAP_MAX_TRAVEL_PX = 5

export function isTapGesture(durationMs: number, travelPx: number): boolean {
  return durationMs <= TAP_MAX_MS && travelPx <= TAP_MAX_TRAVEL_PX
}
