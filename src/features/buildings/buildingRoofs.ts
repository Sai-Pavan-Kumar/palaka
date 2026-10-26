import type { Roof } from '../engine/model/buildings'

type Rect = { x: number; y: number; w: number; h: number }

// Everything a roof needs: where the facade starts, how high it rises.
type Span = {
  left: number
  right: number
  cx: number
  base: number
  top: number
  w: number
}

function sawtooth({ left, base, top, w }: Span): string {
  const teeth = 4
  const step = w / teeth
  let d = `M${left},${base}`
  for (let i = 0; i < teeth; i++) {
    d += ` L${left + i * step},${top} L${left + (i + 1) * step},${base}`
  }
  return `${d} Z`
}

// Three narrowing storeys, like a temple gopuram.
function tiers({ cx, base, top, w }: Span): string {
  const rise = (base - top) / 3
  const widths = [0.8, 0.58, 0.36, 0.14].map((s) => w * s)
  return [0, 1, 2]
    .map((i) => {
      const y0 = base - rise * i
      const y1 = base - rise * (i + 1)
      return `M${cx - widths[i] / 2},${y0} L${cx - widths[i + 1] / 2},${y1} L${cx + widths[i + 1] / 2},${y1} L${cx + widths[i] / 2},${y0} Z`
    })
    .join(' ')
}

function minarets({ left, right, cx, base, top, w }: Span): string {
  const rx = w * 0.26
  const tw = w * 0.09
  const rise = base - top
  const dome = `M${cx - rx},${base} A${rx},${rise * 0.8} 0 0 1 ${cx + rx},${base} Z`
  const tower = (x: number) =>
    `M${x},${base} L${x},${top + tw} L${x + tw / 2},${top} L${x + tw},${top + tw} L${x + tw},${base} Z`
  return `${dome} ${tower(left)} ${tower(right - tw)}`
}

function crenels({ left, base, top, w }: Span): string {
  const n = 5
  const step = w / (n * 2 - 1)
  return Array.from({ length: n }, (_, i) => {
    const x = left + i * 2 * step
    return `M${x},${base} L${x},${top} L${x + step},${top} L${x + step},${base} Z`
  }).join(' ')
}

function simpleRoof(roof: Roof, s: Span): string {
  const { left, right, cx, base, top, w } = s
  const rise = base - top
  switch (roof) {
    case 'gable':
      return `M${left - 10},${base} L${cx},${top} L${right + 10},${base} Z`
    case 'dome':
      return `M${cx - w * 0.32},${base} A${w * 0.32},${rise} 0 0 1 ${cx + w * 0.32},${base} Z`
    case 'spire':
      return `M${cx - w * 0.18},${base} L${cx},${top} L${cx + w * 0.18},${base} Z`
    case 'arch':
      return `M${left},${base} A${w / 2},${rise} 0 0 1 ${right},${base} Z`
    case 'antenna':
      return `M${left - 6},${base} L${left - 6},${base - 10} L${right + 6},${base - 10} L${right + 6},${base} Z M${cx},${base - 10} L${cx},${top + 6}`
    case 'flat':
    case 'awning':
      return `M${left - 6},${base} L${left - 6},${top} L${right + 6},${top} L${right + 6},${base} Z`
    default:
      return ''
  }
}

// SVG path for each roof, from the facade top (body.y) up to the block's
// top. Pure geometry: the view only strokes and fills it.
export function roofPath(roof: Roof, box: Rect, body: Rect): string {
  const span: Span = {
    left: body.x,
    right: body.x + body.w,
    cx: body.x + body.w / 2,
    base: body.y,
    top: box.y,
    w: body.w,
  }
  if (roof === 'sawtooth') return sawtooth(span)
  if (roof === 'tiers') return tiers(span)
  if (roof === 'minarets') return minarets(span)
  if (roof === 'crenels') return crenels(span)
  return simpleRoof(roof, span)
}

// Scalloped shop awning hanging under the sign.
export function awningPath(body: Rect, y: number, height: number): string {
  const n = 6
  const step = body.w / n
  let d = `M${body.x - 8},${y} L${body.x + body.w + 8},${y} L${body.x + body.w + 8},${y + height}`
  for (let i = n; i > 0; i--) {
    const x = body.x + i * step
    d += ` Q${x - step / 2},${y + height * 1.6} ${x - step},${y + height}`
  }
  return `${d} L${body.x - 8},${y + height} Z`
}
