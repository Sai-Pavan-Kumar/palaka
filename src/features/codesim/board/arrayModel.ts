import type { CodePins } from '../../engine/model/types'
import type {
  PyValue,
  SeqValue,
  TraceFrame,
  TraceStep,
} from '../run/traceTypes'
import { currentFrame, formatValue } from './traceFormat'

// More cells than this stop reading as "an array" on a slide.
const MAX_CELLS = 16
const MAX_ARRAYS = 2

// Names people actually use for indexes in interview code. Anything else
// can still be pinned by hand.
const POINTER_NAME =
  /^(i|j|k|l|r|lo|hi|low|high|left|right|mid|start|end|slow|fast|p|q|idx|index|ptr|\w+_(i|j|idx|index|ptr))$/

// Pairs that bound a live search window: cells outside it are dimmed, which
// is the whole visual point of binary search and two pointers.
const RANGE_PAIRS: [string, string][] = [
  ['lo', 'hi'],
  ['low', 'high'],
  ['left', 'right'],
  ['l', 'r'],
  ['start', 'end'],
]

export type ArrayCell = {
  text: string
  changed: boolean
  // Set when this cell's value was swapped in from another index.
  swapFrom?: number
  dim: boolean
}
export type ArrayPointer = { name: string; index: number }
export type ArrayModel = {
  name: string
  cells: ArrayCell[]
  total: number
  pointers: ArrayPointer[]
}

const SCALARS = new Set(['num', 'str', 'bool', 'none'])

function asCellList(value: PyValue | undefined): SeqValue | null {
  if (!value || !('items' in value) || value.t === 'set') return null
  if (value.t === 'listnode') return null
  return value.items.every((item) => SCALARS.has(item.t)) ? value : null
}

function asInt(value: PyValue | undefined): number | null {
  if (!value || value.t !== 'num' || !/^-?\d+$/.test(value.r)) return null
  return Number(value.r)
}

function arrayNames(frame: TraceFrame, pins?: CodePins): string[] {
  const candidates = pins?.arrays.length ? pins.arrays : Object.keys(frame.vars)
  return candidates
    .filter((name) => asCellList(frame.vars[name]))
    .slice(0, MAX_ARRAYS)
}

function pointerList(
  frame: TraceFrame,
  length: number,
  pins?: CodePins,
): ArrayPointer[] {
  const names = pins?.pointers.length
    ? pins.pointers
    : Object.keys(frame.vars).filter((name) => POINTER_NAME.test(name))
  return names.flatMap((name) => {
    const index = asInt(frame.vars[name])
    // One past the end is legal (hi = len(nums)); further is not an index.
    return index !== null && index >= 0 && index <= length
      ? [{ name, index }]
      : []
  })
}

function windowOf(pointers: ArrayPointer[]): [number, number] | null {
  const at = new Map(pointers.map((p) => [p.name, p.index]))
  for (const [from, to] of RANGE_PAIRS) {
    if (at.has(from) && at.has(to)) return [at.get(from)!, at.get(to)!]
  }
  return null
}

// Two cells that traded values become a swap (drawn as a cross-over);
// anything else that changed just flashes.
function diffCells(before: string[] | null, now: string[]) {
  const changed = new Set<number>()
  const swaps = new Map<number, number>()
  if (!before || before.length !== now.length) return { changed, swaps }
  const moved = now.flatMap((text, i) => (text !== before[i] ? [i] : []))
  const [a, b] = moved
  if (moved.length === 2 && before[a] === now[b] && before[b] === now[a]) {
    swaps.set(a, b).set(b, a)
  } else moved.forEach((i) => changed.add(i))
  return { changed, swaps }
}

function sameCall(previous: TraceStep | undefined, step: TraceStep): boolean {
  if (!previous || previous.frames.length !== step.frames.length) return false
  return currentFrame(previous)?.fn === currentFrame(step)?.fn
}

function textsOf(frame: TraceFrame | null, name: string): string[] | null {
  const list = asCellList(frame?.vars[name])
  return list ? list.items.slice(0, MAX_CELLS).map(formatValue) : null
}

export function buildArrays(
  previous: TraceStep | undefined,
  step: TraceStep,
  pins?: CodePins,
): ArrayModel[] {
  const frame = currentFrame(step)
  if (!frame) return []
  const before = sameCall(previous, step) ? currentFrame(previous!) : null
  return arrayNames(frame, pins).map((name, order) => {
    const list = asCellList(frame.vars[name])!
    const texts = textsOf(frame, name)!
    // Pointers belong to the first array; a second one is usually a result.
    const pointers = order === 0 ? pointerList(frame, list.n, pins) : []
    const range = windowOf(pointers)
    const { changed, swaps } = diffCells(textsOf(before, name), texts)
    const cells = texts.map((text, i) => ({
      text,
      changed: changed.has(i),
      swapFrom: swaps.get(i),
      dim: range !== null && (i < range[0] || i > range[1]),
    }))
    return { name, cells, total: list.n, pointers }
  })
}

export type ArrayGeometry = {
  cell: number
  fontPx: number
  labelH: number
  tagH: number
}

export function arrayGeometry(fontPx: number): ArrayGeometry {
  return {
    cell: Math.round(fontPx * 2.4),
    fontPx,
    labelH: Math.round(fontPx * 1.9),
    tagH: Math.round(fontPx * 1.7),
  }
}

// Pointers on the same cell stack downwards, so "lo, mid" never overlap.
export function pointerRows(pointers: ArrayPointer[]): Map<string, number> {
  const used = new Map<number, number>()
  const rows = new Map<string, number>()
  for (const pointer of pointers) {
    const row = used.get(pointer.index) ?? 0
    used.set(pointer.index, row + 1)
    rows.set(pointer.name, row)
  }
  return rows
}

export function arrayHeight(model: ArrayModel, geo: ArrayGeometry): number {
  const rows = Math.max(0, ...pointerRows(model.pointers).values()) + 1
  const pointerSpace = model.pointers.length > 0 ? rows * geo.tagH : 0
  return geo.labelH + geo.cell + pointerSpace + geo.fontPx * 0.5
}
