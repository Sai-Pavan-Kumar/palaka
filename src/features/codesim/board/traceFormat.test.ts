import { describe, expect, it } from 'vitest'
import type { PyValue, TraceStep } from '../run/traceTypes'
import {
  changedNames,
  clipValue,
  formatValue,
  outputLines,
} from './traceFormat'

const num = (r: string): PyValue => ({ t: 'num', r })

function step(fn: string, vars: Record<string, PyValue>, depth = 1): TraceStep {
  const frames = Array.from({ length: depth }, (_, i) => ({
    fn: i === depth - 1 ? fn : '<module>',
    line: 1,
    args: [],
    vars: i === depth - 1 ? vars : {},
  }))
  return { line: 1, event: 'line', frames, stdout: '' }
}

describe('formatValue', () => {
  it('formats Python containers the way Python prints them', () => {
    expect(formatValue({ t: 'list', n: 2, items: [num('1'), num('2')] })).toBe(
      '[1, 2]',
    )
    expect(formatValue({ t: 'list', n: 9, items: [num('1')] })).toBe('[1, …]')
    expect(formatValue({ t: 'set', n: 0, items: [] })).toBe('set()')
    expect(
      formatValue({
        t: 'dict',
        n: 1,
        entries: [[{ t: 'str', r: "'a'" }, num('1')]],
      }),
    ).toBe("{'a': 1}")
  })

  it('draws linked lists as a chain', () => {
    const chain: PyValue = {
      t: 'listnode',
      items: [num('1'), num('2')],
      cycle: false,
    }
    expect(formatValue(chain)).toBe('1 → 2 → None')
    expect(formatValue({ ...chain, cycle: true })).toBe('1 → 2 → (cycle)')
  })

  it('clips long values', () => {
    expect(clipValue('x'.repeat(50))).toHaveLength(36)
  })
})

describe('changedNames', () => {
  it('flags new and changed variables in the same call', () => {
    const before = step('f', { a: num('1'), b: num('2') })
    const after = step('f', { a: num('1'), b: num('3'), c: num('0') })
    expect([...changedNames(before, after)].sort()).toEqual(['b', 'c'])
  })

  it('flags nothing when the call changes', () => {
    const before = step('f', { a: num('1') })
    expect(changedNames(before, step('g', { a: num('2') })).size).toBe(0)
    expect(changedNames(before, step('f', { a: num('2') }, 2)).size).toBe(0)
  })
})

describe('outputLines', () => {
  it('keeps the last lines only', () => {
    expect(outputLines('1\n2\n3\n', 2)).toEqual(['2', '3'])
    expect(outputLines('', 2)).toEqual([])
  })
})
