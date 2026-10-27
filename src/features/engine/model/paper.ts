import { HIGHLIGHT, INK, TINT } from './boardSpec'
import type { ColorKey, Paper, PaperColor, PaperPattern } from './types'

export type PaperTone = 'light' | 'dark'

export const DEFAULT_PAPER: Paper = {
  pattern: 'plain',
  color: 'white',
  showBrand: true,
}

export const PAPER_PATTERNS: { value: PaperPattern; label: string }[] = [
  { value: 'plain', label: 'Plain' },
  { value: 'dots', label: 'Dots' },
  { value: 'grid', label: 'Grid' },
  { value: 'grain', label: 'Grain' },
  { value: 'blueprint', label: 'Blueprint' },
]

// SVG needs plain strings. Values and contrast checks: .agents/Design
// System.md, "Board paper". Every ink keeps ≥ 4.5:1 on every paper.
export const PAPER_COLORS: Record<
  PaperColor,
  { fill: string; tone: PaperTone; label: string }
> = {
  white: { fill: '#ffffff', tone: 'light', label: 'White' },
  cream: { fill: '#fdfaf2', tone: 'light', label: 'Cream' },
  black: { fill: '#111118', tone: 'dark', label: 'Black' }, // --color-surface-card
  blueprint: { fill: '#0a4494', tone: 'dark', label: 'Blueprint' }, // --color-brand-deep
  chalk: { fill: '#1d2b25', tone: 'dark', label: 'Chalk' },
}

// On dark paper black ink would vanish, so every colour swaps to a light
// version that keeps its meaning (red stays red) and its contrast.
const DARK_INK: Record<ColorKey, string> = {
  black: '#f5f5fa',
  blue: '#a9c9ff',
  red: '#ffa39a',
  green: '#7ce8b4',
  orange: '#ffc085',
  violet: '#cdbcff',
  // Kept as the real brand blue on purpose (owner request). Below text
  // contrast on dark paper: for shapes and big text, see Design System.
  brand: '#005ae0',
}

export type BoardPalette = {
  tone: PaperTone
  ink: Record<ColorKey, string>
  // Tint fill: light paper uses pale colours, dark paper uses the ink itself
  // at low opacity (a pale fill would glare on a dark board).
  tint: (color: ColorKey) => { fill: string; opacity: number }
  highlight: Record<ColorKey, string>
  highlightBlend: 'multiply' | 'screen'
  brand: string
  patternLine: string
  patternMajor: string
  // The paper colour itself: behind connector labels, so a label cuts
  // cleanly through the line under it.
  paper: string
  // Icon and label colour on a solid-filled block, where ink would vanish.
  onSolid: string
}

type ToneColors = Omit<BoardPalette, 'paper'>

const LIGHT_PALETTE: ToneColors = {
  tone: 'light',
  ink: INK,
  tint: (color) => ({ fill: TINT[color], opacity: 1 }),
  highlight: HIGHLIGHT,
  highlightBlend: 'multiply',
  brand: '#005ae0', // --color-brand-primary
  // Faint on purpose (1.2–1.5:1): the paper must never compete with text.
  patternLine: 'rgba(13, 13, 26, 0.1)',
  patternMajor: 'rgba(13, 13, 26, 0.18)',
  onSolid: '#ffffff',
}

const DARK_PALETTE: ToneColors = {
  tone: 'dark',
  ink: DARK_INK,
  tint: (color) => ({ fill: DARK_INK[color], opacity: 0.22 }),
  highlight: HIGHLIGHT,
  highlightBlend: 'screen',
  // Brand blue disappears on blueprint blue, so the mark turns white.
  brand: '#ffffff',
  patternLine: 'rgba(255, 255, 255, 0.14)',
  patternMajor: 'rgba(255, 255, 255, 0.26)',
  onSolid: '#0d0d1a', // --color-text-primary-light
}

// Built once per paper colour, so the palette object stays the same between
// renders and shape views do not re-render on every board edit.
const PALETTES = Object.fromEntries(
  Object.entries(PAPER_COLORS).map(([color, { fill, tone }]) => [
    color,
    { ...(tone === 'dark' ? DARK_PALETTE : LIGHT_PALETTE), paper: fill },
  ]),
) as Record<PaperColor, BoardPalette>

export function getPalette(paper: Paper): BoardPalette {
  return PALETTES[paper.color]
}

// Boards saved before paper existed (or with an unknown value) get the
// default, instead of failing to load. Mist was removed 2026-10-27 for
// Black; old Mist boards open on White, its nearest colour.
export function normalizePaper(value: unknown): Paper {
  if (typeof value !== 'object' || value === null) return DEFAULT_PAPER
  const paper = value as Partial<Paper>
  const isPattern = PAPER_PATTERNS.some((p) => p.value === paper.pattern)
  const isColor = typeof paper.color === 'string' && paper.color in PAPER_COLORS
  return {
    pattern: isPattern ? paper.pattern! : DEFAULT_PAPER.pattern,
    color: isColor ? paper.color! : DEFAULT_PAPER.color,
    showBrand:
      typeof paper.showBrand === 'boolean'
        ? paper.showBrand
        : DEFAULT_PAPER.showBrand,
  }
}
