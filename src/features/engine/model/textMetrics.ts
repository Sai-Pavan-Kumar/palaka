import { FONT_FAMILY, FONT_SIZE, FONT_WEIGHT, LINE_HEIGHT } from './boardSpec'
import type { TextShape } from './types'

// One shared canvas for measuring. Widths are cached per font and line,
// because selection boxes ask for text bounds on every pointer move.
let context: CanvasRenderingContext2D | null = null
const widthCache = new Map<string, number>()
const baselineCache = new Map<string, number>()

// Until the brand fonts arrive, widths come from the fallback font. Throw
// them away once the real fonts load.
if (typeof document !== 'undefined' && document.fonts) {
  document.fonts.addEventListener('loadingdone', () => {
    widthCache.clear()
    baselineCache.clear()
  })
}

function getContext(): CanvasRenderingContext2D | null {
  if (context) return context
  if (typeof document !== 'undefined') {
    context = document.createElement('canvas').getContext('2d')
  } else if (typeof OffscreenCanvas !== 'undefined') {
    context = new OffscreenCanvas(1, 1).getContext(
      '2d',
    ) as unknown as CanvasRenderingContext2D
  }
  return context
}

export function measureLine(line: string, fontCss: string): number {
  const key = `${fontCss}|${line}`
  let width = widthCache.get(key)
  if (width === undefined) {
    const ctx = getContext()
    if (ctx) {
      ctx.font = fontCss
      width = ctx.measureText(line).width
    } else {
      width = line.length * 10
    }
    widthCache.set(key, width)
  }
  return width
}

export function getFontPx(shape: Pick<TextShape, 'size' | 'scale'>): number {
  return FONT_SIZE[shape.size] * shape.scale
}

export function getFontCss(shape: Pick<TextShape, 'font' | 'size' | 'scale'>) {
  return `${FONT_WEIGHT[shape.font]} ${getFontPx(shape)}px ${FONT_FAMILY[shape.font]}`
}

export function getTextLines(text: string): string[] {
  return text.split('\n')
}

// Longest start of `text` that fits: for one word wider than the line.
function fittingPrefix(text: string, maxWidth: number, fontCss: string) {
  let end = text.length - 1
  while (end > 1 && measureLine(text.slice(0, end), fontCss) > maxWidth) end--
  return Math.max(end, 1)
}

// Greedy word wrap, the same rule a browser uses for a pre-wrap textarea:
// spaces stay on the line they end and may hang past the edge, so the
// editor and the drawn text break in the same places.
function wrapLine(line: string, maxWidth: number, fontCss: string): string[] {
  const fits = (text: string) =>
    measureLine(text.trimEnd(), fontCss) <= maxWidth
  if (fits(line)) return [line]
  const out: string[] = []
  let current = ''
  for (const word of line.split(/(?<= )/)) {
    if (current && !fits(current + word)) {
      out.push(current)
      current = word
    } else current += word
    while (!fits(current) && current.trimEnd().length > 1) {
      const cut = fittingPrefix(current, maxWidth, fontCss)
      out.push(current.slice(0, cut))
      current = current.slice(cut)
    }
  }
  out.push(current)
  return out
}

// The lines a text shape really draws: typed breaks, then wrapping.
export function getShapeLines(shape: TextShape): string[] {
  const lines = getTextLines(shape.text)
  if (!shape.wrapWidth) return lines
  const fontCss = getFontCss(shape)
  return lines.flatMap((line) => wrapLine(line, shape.wrapWidth!, fontCss))
}

// Width of the widest line, height of all lines. An empty box keeps a
// caret-sized width so a new text box is still clickable.
export function measureText(shape: TextShape): { w: number; h: number } {
  const fontPx = getFontPx(shape)
  const fontCss = getFontCss(shape)
  const lines = getShapeLines(shape)
  const widest = Math.max(...lines.map((line) => measureLine(line, fontCss)))
  return {
    w: Math.max(widest, fontPx * 0.5),
    h: lines.length * fontPx * LINE_HEIGHT,
  }
}

// Distance from the top of a line box to the text baseline, laid out the way
// CSS does it (half the leading above, then the font's ascent). The SVG text
// and the textarea editor then put every glyph on the same pixel.
export function getBaselineOffset(
  shape: Pick<TextShape, 'font' | 'size' | 'scale'>,
): number {
  const fontCss = getFontCss(shape)
  let offset = baselineCache.get(fontCss)
  if (offset === undefined) {
    const ctx = getContext()
    if (ctx) {
      ctx.font = fontCss
      const metrics = ctx.measureText('Hg')
      const ascent = metrics.fontBoundingBoxAscent
      const descent = metrics.fontBoundingBoxDescent
      const lineBox = getFontPx(shape) * LINE_HEIGHT
      offset = (lineBox - (ascent + descent)) / 2 + ascent
    } else {
      offset = getFontPx(shape) * 0.8
    }
    baselineCache.set(fontCss, offset)
  }
  return offset
}
