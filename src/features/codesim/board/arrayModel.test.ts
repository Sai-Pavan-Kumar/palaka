import { describe, expect, it } from 'vitest'
import type { PyValue, TraceStep } from '../run/traceTypes'
import { buildArrays } from './arrayModel'

const num = (n: number): PyValue => ({ t: 'num', r: String(n) })
const list = (...values: number[]): PyValue => ({
  t: 'list',
  n: values.length,
  items: values.map(num),
})

function step(vars: Record<string, PyValue>, fn = 'f'): TraceStep {
  return {
    line: 1,
    event: 'line',
    stdout: '',
    frames: [{ fn, line: 1, args: [], vars }],
  }
}

describe('buildArrays', () => {
  it('draws lists of plain values and skips everything else', () => {
    const [only, ...rest] = buildArrays(
      undefined,
      step({
        nums: list(3, 1),
        n: num(2),
        grid: { t: 'dict', n: 0, entries: [] },
      }),
    )
    expect(rest).toHaveLength(0)
    expect(only.name).toBe('nums')
    expect(only.cells.map((c) => c.text)).toEqual(['3', '1'])
  })

  it('turns index-like ints into pointers, one past the end included', () => {
    const [arr] = buildArrays(
      undefined,
      step({
        nums: list(1, 2, 3),
        i: num(0),
        hi: num(3),
        total: num(1),
        j: num(9),
      }),
    )
    expect(arr.pointers).toEqual([
      { name: 'i', index: 0 },
      { name: 'hi', index: 3 },
    ])
  })

  it('dims cells outside the lo..hi window', () => {
    const [arr] = buildArrays(
      undefined,
      step({ nums: list(1, 2, 3, 4), lo: num(1), hi: num(2) }),
    )
    expect(arr.cells.map((c) => c.dim)).toEqual([true, false, false, true])
  })

  it('detects a swap between two cells', () => {
    const before = step({ nums: list(5, 2, 4) })
    const [arr] = buildArrays(before, step({ nums: list(2, 5, 4) }))
    expect(arr.cells.map((c) => c.swapFrom)).toEqual([1, 0, undefined])
    expect(arr.cells.some((c) => c.changed)).toBe(false)
  })

  it('flashes a plain write, and nothing across different calls', () => {
    const before = step({ nums: list(1, 2) })
    const [arr] = buildArrays(before, step({ nums: list(1, 7) }))
    expect(arr.cells.map((c) => c.changed)).toEqual([false, true])
    const [other] = buildArrays(before, step({ nums: list(1, 7) }, 'g'))
    expect(other.cells.some((c) => c.changed)).toBe(false)
  })

  it('follows pins over the guess', () => {
    const vars = { a: list(1), b: list(2, 3), x: num(1) }
    const [arr] = buildArrays(undefined, step(vars), {
      arrays: ['b'],
      pointers: ['x'],
    })
    expect(arr.name).toBe('b')
    expect(arr.pointers).toEqual([{ name: 'x', index: 1 }])
  })
})
