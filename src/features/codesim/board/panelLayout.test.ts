import { describe, expect, it } from 'vitest'
import type { PyValue, TraceFrame, TraceStep } from '../run/traceTypes'
import { runHasNestedCalls, stackRows } from './panelLayout'

const num = (r: string): PyValue => ({ t: 'num', r })

function frame(fn: string, n?: string): TraceFrame {
  return n === undefined
    ? { fn, line: 1, args: [], vars: {} }
    : { fn, line: 1, args: ['n'], vars: { n: num(n), acc: num('9') } }
}

function step(frames: TraceFrame[], ret?: PyValue): TraceStep {
  return { line: 1, event: ret ? 'return' : 'line', frames, stdout: '', ret }
}

describe('stackRows', () => {
  it('lists calls newest first with their arguments only', () => {
    const rows = stackRows(
      step([frame('<module>'), frame('fact', '3'), frame('fact', '2')]),
    )
    expect(rows.map((r) => r.text)).toEqual(['fact(n=2)', 'fact(n=3)'])
    expect(rows.map((r) => r.isTop)).toEqual([true, false])
    expect(rows.map((r) => r.key)).toEqual(['1:fact', '0:fact'])
  })

  it('shows the value a returning call hands back', () => {
    const [top] = stackRows(step([frame('fact', '1')], num('1')))
    expect(top.text).toBe('fact(n=1) → 1')
  })
})

describe('runHasNestedCalls', () => {
  it('is true only when calls stack on each other', () => {
    const flat = step([frame('<module>'), frame('sort', '1')])
    const nested = step([frame('fact', '2'), frame('fact', '1')])
    expect(runHasNestedCalls([flat])).toBe(false)
    expect(runHasNestedCalls([flat, nested])).toBe(true)
  })
})
