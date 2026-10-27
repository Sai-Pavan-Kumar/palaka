import { describe, expect, it } from 'vitest'
import type { PyValue, TraceStep } from '../run/traceTypes'
import { buildGraph, layeredLayout } from './graphModel'
import { buildLinked } from './linkedModel'

const num = (r: string | number): PyValue => ({ t: 'num', r: String(r) })
const none: PyValue = { t: 'none', r: 'None' }

function chain(ids: number[], more = false): PyValue {
  return { t: 'listnode', items: ids.map(num), ids, cycle: false, more }
}

function step(vars: Record<string, PyValue>): TraceStep {
  return {
    line: 1,
    event: 'line',
    stdout: '',
    frames: [{ fn: 'f', line: 1, args: [], vars }],
  }
}

describe('buildLinked', () => {
  it('merges every variable into one set of nodes and arrows', () => {
    // Mid-reversal: 2 -> 1 -> None, and 3 -> 4 -> None.
    const model = buildLinked(
      step({ prev: chain([2, 1]), curr: chain([3, 4]), result: none }),
    )!
    expect(model.nodes.map((n) => n.id)).toEqual([1, 2, 3, 4])
    expect(model.links).toEqual(
      expect.arrayContaining([
        { from: 2, to: 1 },
        { from: 1, to: null },
        { from: 3, to: 4 },
        { from: 4, to: null },
      ]),
    )
    expect(model.labels).toEqual([
      { name: 'prev', id: 2 },
      { name: 'curr', id: 3 },
    ])
  })

  it('labels a list pointer that is None, and skips cut-off chain ends', () => {
    const model = buildLinked(step({ prev: none, curr: chain([1, 2], true) }))!
    expect(model.labels[0]).toEqual({ name: 'prev', id: null })
    expect(model.links).toEqual([{ from: 1, to: 2 }])
  })

  it('is null when nothing is a linked list', () => {
    expect(buildLinked(step({ n: num(1) }))).toBeNull()
  })
})

const GRAPH: PyValue = {
  t: 'dict',
  n: 3,
  entries: [
    [num(0), { t: 'list', n: 2, items: [num(1), num(2)] }],
    [num(1), { t: 'list', n: 1, items: [num(0)] }],
    [num(2), { t: 'list', n: 1, items: [num(0)] }],
  ],
}

describe('buildGraph', () => {
  it('finds a dict of neighbour lists and colours BFS state', () => {
    const model = buildGraph(
      step({
        graph: GRAPH,
        visited: { t: 'set', n: 2, items: [num(0), num(1)] },
        queue: { t: 'deque', n: 1, items: [num(1)] },
        node: num(0),
        nxt: num(1),
      }),
    )!
    expect(model.nodes).toEqual([
      { key: '0', state: 'current' },
      { key: '1', state: 'queued' },
      { key: '2', state: 'new' },
    ])
    expect(model.edges).toHaveLength(2)
    expect(model.edges.find((e) => e.active)).toMatchObject({ a: '0', b: '1' })
    expect(model.edges.every((e) => !e.directed)).toBe(true)
  })

  it('lays nodes out in rows by distance from the first node', () => {
    const model = buildGraph(step({ graph: GRAPH }))!
    const { spots } = layeredLayout(model, 100, 80)
    expect(spots.get('0')).toEqual({ x: 50, y: 0 })
    expect(spots.get('1')!.y).toBe(80)
    expect(spots.get('2')!.y).toBe(80)
  })
})
