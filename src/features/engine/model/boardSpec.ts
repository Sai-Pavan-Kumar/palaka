import type { Aspect, ColorKey, FontKey, SizeKey, StrokeShape } from './types'

export const SLIDE_SIZE: Record<Aspect, { width: number; height: number }> = {
  '16:9': { width: 1920, height: 1080 },
  '9:16': { width: 1080, height: 1920 },
}

export function getPageWidth(aspect: Aspect, frameCount = 1): number {
  return SLIDE_SIZE[aspect].width * frameCount
}

export const COLOR_KEYS: ColorKey[] = [
  'black',
  'blue',
  'red',
  'green',
  'orange',
  'violet',
  'brand',
]

// Board ink, not UI: SVG needs plain strings. Every ink colour has at least
// 4.5:1 contrast on white so it stays readable in a compressed video.
// Values and reasons: .agents/Design System.md, "Board ink palette".
export const INK: Record<ColorKey, string> = {
  black: '#0d0d1a', // --color-text-primary-light
  blue: '#005ae0', // --color-brand-primary
  red: '#d92d20',
  green: '#067647',
  orange: '#b54708',
  violet: '#6e3ff3',
  brand: '#005ae0', // --color-brand-primary
}

export const TINT: Record<ColorKey, string> = {
  black: '#ededf2',
  blue: '#e0ecff', // --color-brand-primary-pale
  red: '#fde7e5',
  green: '#dff5ea',
  orange: '#fdebdd',
  violet: '#ece6fe',
  brand: '#e0ecff',
}

// Highlighters need bright, light colours: dark ink at 40% looks muddy.
export const HIGHLIGHT: Record<ColorKey, string> = {
  black: '#ffe14d',
  blue: '#6aa3f8', // --color-brand-primary-lighter
  red: '#ff8a80',
  green: '#5ee0a0',
  orange: '#ffb066',
  violet: '#b79cff',
  brand: '#6aa3f8',
}

export const HIGHLIGHT_OPACITY = 0.4
const HIGHLIGHT_WIDTH_FACTOR = 4

export const SIZE_KEYS: SizeKey[] = ['s', 'm', 'l', 'xl']

// Line widths in slide pixels, tuned to read clearly in a 1080p video.
export const STROKE_WIDTH: Record<SizeKey, number> = {
  s: 4,
  m: 7,
  l: 11,
  xl: 18,
}

export const FONT_SIZE: Record<SizeKey, number> = {
  s: 32,
  m: 48,
  l: 72,
  xl: 110,
}

export const LINE_HEIGHT = 1.25

// Same stacks as --font-brand / --font-code in tokens.css.
export const FONT_FAMILY: Record<FontKey, string> = {
  brand: "'Overused Grotesk', system-ui, 'Segoe UI', Arial, sans-serif",
  code: "'Geist Mono', ui-monospace, 'Cascadia Mono', Consolas, monospace",
}

export const FONT_WEIGHT: Record<FontKey, number> = {
  brand: 500,
  code: 400,
}

export function getStrokeWidth(shape: {
  size: SizeKey
  scale?: number
}): number {
  return STROKE_WIDTH[shape.size] * (shape.scale ?? 1)
}

export function getPenWidth(shape: StrokeShape): number {
  const width = getStrokeWidth(shape)
  return shape.kind === 'highlighter' ? width * HIGHLIGHT_WIDTH_FACTOR : width
}

// One hatch pattern per ink colour lives in each board SVG under this id.
export function hatchPatternId(color: ColorKey): string {
  return `hatch-${color}`
}
