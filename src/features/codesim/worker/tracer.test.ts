import { loadPyodide, type PyodideAPI } from 'pyodide'
import { beforeAll, describe, expect, it } from 'vitest'
import type { TraceResult } from '../run/traceTypes'
import { CODE_TEMPLATES } from '../templates'
import TRACER_SOURCE from './tracer.py?raw'

// The real runtime, not a mock: the tracer leans on CPython details
// (frame filenames, settrace events) that only a real interpreter proves.
let py: PyodideAPI

function run(source: string, call = ''): TraceResult {
  const runTraced = py.globals.get('run_traced')
  const json = runTraced(source, call) as string
  runTraced.destroy()
  return JSON.parse(json) as TraceResult
}

beforeAll(async () => {
  py = await loadPyodide()
  py.runPython(TRACER_SOURCE)
}, 60_000)

const BINARY_SEARCH = `class Solution:
    def search(self, nums: List[int], target: int) -> int:
        lo, hi = 0, len(nums) - 1
        while lo <= hi:
            mid = (lo + hi) // 2
            if nums[mid] == target:
                return mid
            if nums[mid] < target:
                lo = mid + 1
            else:
                hi = mid - 1
        return -1`

describe('tracer', () => {
  it('runs a LeetCode class with a call line and records each line', () => {
    const out = run(BINARY_SEARCH, 'Solution().search([-1,0,3,5,9,12], 9)')
    expect(out.error).toBeNull()
    expect(out.result).toEqual({ t: 'num', r: '4' })
    const last = out.steps.at(-1)!
    expect(last.event).toBe('return')
    expect(last.frames.at(-1)!.vars.mid).toEqual({ t: 'num', r: '4' })
    expect(last.frames.at(-1)!.vars).not.toHaveProperty('self')
  })

  it('records parameter names per call, without self', () => {
    const out = run(BINARY_SEARCH, 'Solution().search([1, 2], 2)')
    expect(out.steps.at(-1)!.frames.at(-1)!.args).toEqual(['nums', 'target'])
  })

  it('hides prelude names and functions from module variables', () => {
    const out = run('x = 3\ndef f():\n    return 1\ny = f()')
    const vars = out.steps.at(-1)!.frames[0].vars
    expect(Object.keys(vars).sort()).toEqual(['x', 'y'])
  })

  it('captures print output per step', () => {
    const out = run('print("a")\nprint("b")')
    expect(out.stdout).toBe('a\nb\n')
    expect(out.steps.at(-1)!.stdout).toBe('a\nb\n')
  })

  it('reports syntax and runtime errors with their line', () => {
    expect(run('x = (1,\ny = 2').error?.line).toBe(1)
    const crash = run('a = 1\nb = a / 0')
    expect(crash.error).toEqual({
      line: 2,
      message: 'ZeroDivisionError: division by zero',
    })
    expect(run('x = 1', 'f(').error?.message).toMatch(/Run with line/)
  })

  it('stops endless loops even when the code catches Exception', () => {
    const out = run(
      'while True:\n    try:\n        x = 1\n    except Exception:\n        pass',
    )
    expect(out.steps).toHaveLength(5000)
    expect(out.error?.message).toMatch(/Stopped after 5000 steps/)
  })

  it('stops recursion without a base case', () => {
    const out = run('def f(n):\n    return f(n + 1)', 'f(0)')
    expect(out.error?.message).toMatch(/deeper than 50/)
  })

  it('describes linked lists built with the prelude helper', () => {
    const out = run('head = build_list([1, 2, 3])')
    expect(out.steps.at(-1)!.frames[0].vars.head).toMatchObject({
      t: 'listnode',
      items: [{ r: '1' }, { r: '2' }, { r: '3' }],
      cycle: false,
    })
  })

  it.each(CODE_TEMPLATES)('runs the $label template cleanly', (template) => {
    const out = run(template.source, template.call)
    expect(out.error).toBeNull()
    expect(out.steps.length).toBeGreaterThan(3)
  })
})
