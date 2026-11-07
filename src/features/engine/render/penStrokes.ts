import { FONT_FAMILY, FONT_WEIGHT } from '../model/boardSpec'
import {
  extractGlyphStrokes,
  type GlyphStrokes,
  type StrokePoint,
} from '../model/glyphStrokes'
import type { WritingStep } from '../model/textReveal'
import type { FontKey } from '../model/types'

export const RASTER_PX = 120
export const GLYPH_W = 240
export const GLYPH_H = 200
export const ORIGIN_X = 60
export const BASELINE_Y = 140
const INK_ALPHA = 110
// The pen needs a moment to travel between strokes of one letter.
const STROKE_LIFT_SHARE = 0.12
// Keeps a dot from vanishing into a zero-length time slice.
const MIN_STROKE_LENGTH = 8
// Every point would put thousands of nodes in the DOM with no visible gain.
const PATH_POINT_STEP = 3

const glyphCache = new Map<string, GlyphStrokes | null>()

function readInk(char: string, font: string): Uint8Array | null {
  const canvas = document.createElement('canvas')
  canvas.width = GLYPH_W
  canvas.height = GLYPH_H
  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (!context) return null
  context.font = font
  context.fillText(char, ORIGIN_X, BASELINE_Y)
  const { data } = context.getImageData(0, 0, GLYPH_W, GLYPH_H)
  const ink = new Uint8Array(GLYPH_W * GLYPH_H)
  for (let i = 0; i < ink.length; i++) {
    ink[i] = data[i * 4 + 3] > INK_ALPHA ? 1 : 0
  }
  return ink
}

function touchesEdge(ink: Uint8Array) {
  for (let x = 0; x < GLYPH_W; x++) {
    if (ink[x] || ink[(GLYPH_H - 1) * GLYPH_W + x]) return true
  }
  for (let y = 0; y < GLYPH_H; y++) {
    if (ink[y * GLYPH_W] || ink[y * GLYPH_W + GLYPH_W - 1]) return true
  }
  return false
}

// Null sends the caller to the plain wipe. A font still loading is not cached,
// or the fallback font's shapes would stay for the whole session.
export function getGlyphStrokes(
  char: string,
  fontKey: FontKey,
): GlyphStrokes | null {
  const cacheKey = `${fontKey}|${char}`
  const cached = glyphCache.get(cacheKey)
  if (cached !== undefined) return cached
  const font = `${FONT_WEIGHT[fontKey]} ${RASTER_PX}px ${FONT_FAMILY[fontKey]}`
  if (typeof document === 'undefined' || !document.fonts?.check(font)) {
    return null
  }
  const ink = readInk(char, font)
  const glyph =
    ink && !touchesEdge(ink)
      ? extractGlyphStrokes({ ink, width: GLYPH_W, height: GLYPH_H })
      : null
  const usable = glyph && glyph.strokes.length > 0 ? glyph : null
  glyphCache.set(cacheKey, usable)
  return usable
}

const COMMON_LETTERS =
  'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'

// Extraction costs milliseconds per letter. Doing it on idle keeps that hitch
// out of the first reveal, which may be on camera.
export async function warmPenStrokes() {
  const font = `${FONT_WEIGHT.brand} ${RASTER_PX}px ${FONT_FAMILY.brand}`
  await document.fonts.load(font)
  const letters = [...COMMON_LETTERS]
  const warmNext = () => {
    const letter = letters.shift()
    if (!letter) return
    getGlyphStrokes(letter, 'brand')
    requestIdleCallback(warmNext)
  }
  requestIdleCallback(warmNext)
}

export function toPathData(points: StrokePoint[]) {
  const kept = points.filter(
    (_, index) => index % PATH_POINT_STEP === 0 || index === points.length - 1,
  )
  const [first, ...rest] = kept
  // A dot has no length to dash along, so it gets the shortest possible line.
  const line = rest.length
    ? rest.map((point) => `L${point.x} ${point.y}`).join('')
    : `L${first.x + 0.01} ${first.y}`
  return `M${first.x} ${first.y}${line}`
}

// Longer strokes take longer, because the pen moves at one speed.
export function getStrokeSteps(
  lengths: number[],
  { delay, duration }: WritingStep,
): WritingStep[] {
  const lifts = lengths.length > 1 ? duration * STROKE_LIFT_SHARE : 0
  const liftEach = lifts / Math.max(lengths.length - 1, 1)
  const weights = lengths.map((length) => Math.max(length, MIN_STROKE_LENGTH))
  const total = weights.reduce((sum, weight) => sum + weight, 0)
  let elapsed = delay
  return weights.map((weight) => {
    const seconds = ((duration - lifts) * weight) / total
    const step = { delay: elapsed, duration: seconds }
    elapsed += seconds + liftEach
    return step
  })
}
