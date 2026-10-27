import type { ArrayGeometry } from './arrayModel'
import { labelRows, type LinkedModel, type ListLink } from './linkedModel'

export type ListGeometry = {
  w: number
  h: number
  pitch: number
  top: number
  geo: ArrayGeometry
}

export function listGeometry(model: LinkedModel, geo: ArrayGeometry) {
  const rows = Math.max(0, ...labelRows(model.labels).values()) + 1
  const w = geo.cell
  return { w, h: geo.cell * 0.8, pitch: w * 2, top: rows * geo.tagH, geo }
}

export function listHeight(model: LinkedModel, geo: ArrayGeometry): number {
  const g = listGeometry(model, geo)
  return g.top + g.h + geo.cell
}

export function slotX(model: LinkedModel, g: ListGeometry, id: number | null) {
  const index = model.nodes.findIndex((node) => node.id === id)
  return (index === -1 ? model.nodes.length : index) * g.pitch
}

export function arrowHead(
  x: number,
  y: number,
  dx: number,
  dy: number,
  size: number,
) {
  const len = Math.hypot(dx, dy) || 1
  const [ux, uy] = [dx / len, dy / len]
  const [bx, by] = [x - ux * size, y - uy * size]
  return `M${x} ${y} L${bx - uy * size * 0.6} ${by + ux * size * 0.6} L${bx + uy * size * 0.6} ${by - ux * size * 0.6} Z`
}

// Straight through the gap for neighbours (rightward on the upper half,
// leftward on the lower, so a reversal never overlaps), a dip below the
// row for anything further, a short drop for a None in the middle.
export function linkPath(model: LinkedModel, g: ListGeometry, link: ListLink) {
  const from = slotX(model, g, link.from)
  const cy = g.top + g.h / 2
  const isLast = from === (model.nodes.length - 1) * g.pitch
  if (link.to === null && !isLast) {
    const x = from + g.w / 2
    return {
      d: `M${x} ${g.top + g.h} L${x} ${g.top + g.h * 1.6}`,
      end: [x, g.top + g.h * 1.6, 0, 1],
    }
  }
  const to = slotX(model, g, link.to)
  const step = (to - from) / g.pitch
  if (step === 1 || link.to === null) {
    const y = cy - g.h * 0.18
    return { d: `M${from + g.w} ${y} L${to} ${y}`, end: [to, y, 1, 0] }
  }
  if (step === -1) {
    const y = cy + g.h * 0.18
    return { d: `M${from} ${y} L${to + g.w} ${y}`, end: [to + g.w, y, -1, 0] }
  }
  const [x1, x2, low] = [from + g.w / 2, to + g.w / 2, g.top + g.h * 1.9]
  return {
    d: `M${x1} ${g.top + g.h} Q${(x1 + x2) / 2} ${low} ${x2} ${g.top + g.h}`,
    end: [x2, g.top + g.h, x2 - (x1 + x2) / 2, g.top + g.h - low],
  }
}

export type NoneMark = {
  key: number
  x: number
  y: number
  anchor: 'start' | 'middle'
}

// "None" is drawn right of the last node, or under a node that points to
// None mid-row; a label holding None also needs the end-of-row slot.
export function noneMarks(model: LinkedModel, g: ListGeometry): NoneMark[] {
  const lastId = model.nodes.at(-1)?.id
  const marks: NoneMark[] = model.links.flatMap((link): NoneMark[] => {
    if (link.to !== null) return []
    const isLast = link.from === lastId
    const x = isLast
      ? model.nodes.length * g.pitch + g.geo.fontPx * 0.2
      : slotX(model, g, link.from) + g.w / 2
    const y = isLast ? g.top + g.h / 2 : g.top + g.h * 1.6 + g.geo.fontPx * 0.7
    return [{ key: link.from, x, y, anchor: isLast ? 'start' : 'middle' }]
  })
  if (
    model.labels.some((l) => l.id === null) &&
    !marks.some((m) => m.anchor === 'start')
  ) {
    marks.push({
      key: -1,
      x: model.nodes.length * g.pitch + g.geo.fontPx * 0.2,
      y: g.top + g.h / 2,
      anchor: 'start',
    })
  }
  return marks
}
