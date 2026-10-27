import { SLIDE_SIZE } from './boardSpec'
import { measureText } from './textMetrics'
import type { Aspect, TextShape } from './types'

// Breathing room kept between text and the board edge, in board units.
const EDGE = 48
// Below this a line wraps every word or two: shrinking reads better.
const MIN_WRAP_WIDTH = 160
// Never smaller than half size: past that the text is unreadable on video.
const MIN_SCALE = 0.5
const SHRINK_STEP = 0.92

export type TextArea = { right: number; bottom: number }

// The edge of the frame the text starts in, so text on a two-frame page
// wraps inside its own frame instead of running into the next one.
export function textAreaFor(
  x: number,
  aspect: Aspect,
  frameCount: number,
): TextArea {
  const { width, height } = SLIDE_SIZE[aspect]
  const frame = Math.min(Math.max(Math.floor(x / width), 0), frameCount - 1)
  return { right: (frame + 1) * width - EDGE, bottom: height - EDGE }
}

// Code and query cards keep their lines exactly (line numbers, the running
// line band), so they never wrap; they only shrink.
function keepsLines(shape: TextShape): boolean {
  return shape.codeCall !== undefined || shape.fromQuery !== undefined
}

function fits(shape: TextShape, area: TextArea): boolean {
  const { w, h } = measureText(shape)
  const withinBottom = shape.y + h <= area.bottom
  return keepsLines(shape)
    ? withinBottom && shape.x + w <= area.right
    : withinBottom
}

// Whatever is typed stays on the board: long lines wrap at the right edge,
// and text that would run past the bottom shrinks until it fits. It only
// ever shrinks: growing back while someone types would make text jump.
export function fitTextToBoard(shape: TextShape, area: TextArea): TextShape {
  let next = keepsLines(shape)
    ? shape
    : { ...shape, wrapWidth: Math.max(MIN_WRAP_WIDTH, area.right - shape.x) }
  while (!fits(next, area) && next.scale * SHRINK_STEP >= MIN_SCALE) {
    next = { ...next, scale: Math.round(next.scale * SHRINK_STEP * 100) / 100 }
  }
  return next
}
