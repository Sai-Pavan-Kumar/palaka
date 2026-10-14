import type { PaperTone } from '../model/paper'

// Small tile, repeated across the slide. 160 px is big enough that the eye
// does not catch the repeat, small enough to build instantly.
export const GRAIN_TILE = 160
// Very light on purpose: grain is noise, and noise costs video bitrate and
// can fight thin text. Specks stay far below ink contrast.
const MAX_SPECK_ALPHA = { light: 0.07, dark: 0.08 }
// Only some pixels get a speck, so it reads as paper fibre, not TV static.
const SPECK_DENSITY = 0.55
// A fixed seed: the same grain on screen, in every frame of the video and
// in every export.
const SEED = 20261015

const cache = new Map<PaperTone, string>()

// mulberry32: tiny, fast, good enough for visual noise.
function seededRandom(seed: number): () => number {
  let state = seed
  return () => {
    state = (state + 0x6d2b79f5) | 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// Dark specks on light paper, light specks on dark paper. Returned as a
// data URL so it also works inside exported SVGs, which cannot fetch files.
export function getGrainTile(tone: PaperTone): string {
  const cached = cache.get(tone)
  if (cached) return cached
  const canvas = document.createElement('canvas')
  canvas.width = GRAIN_TILE
  canvas.height = GRAIN_TILE
  const context = canvas.getContext('2d')!
  const image = context.createImageData(GRAIN_TILE, GRAIN_TILE)
  const random = seededRandom(SEED)
  const shade = tone === 'light' ? 13 : 255
  for (let i = 0; i < image.data.length; i += 4) {
    image.data[i] = shade
    image.data[i + 1] = shade
    image.data[i + 2] = shade
    const hasSpeck = random() < SPECK_DENSITY
    image.data[i + 3] = hasSpeck ? random() * MAX_SPECK_ALPHA[tone] * 255 : 0
  }
  context.putImageData(image, 0, 0)
  const url = canvas.toDataURL('image/png')
  cache.set(tone, url)
  return url
}
