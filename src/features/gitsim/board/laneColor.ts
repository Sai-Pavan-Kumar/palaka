import type { BoardPalette } from '../../engine/model/paper'
import type { ColorKey } from '../../engine/model/types'

const LANE_COLORS: ColorKey[] = ['blue', 'green', 'orange', 'violet', 'red']

// Detached commits have no branch, so they get plain ink instead of a
// branch colour: the missing colour is the lesson.
export function laneColor(
  palette: BoardPalette,
  laneIndex: number,
  lane: string,
): string {
  if (lane === 'HEAD') return palette.ink.black
  return palette.ink[LANE_COLORS[laneIndex % LANE_COLORS.length]]
}
