import { describe, expect, it } from 'vitest'
import { buildSimGraph } from './simGraph'
import { SimEngine } from './simEngine'
import { board, run, stats } from './testBoard'

describe('taking a block down', () => {
  it('a load balancer fails over to the healthy servers', () => {
    const b = board(
      [
        ['user', 'user'],
        ['lb', 'loadBalancer'],
        ['s1', 'service'],
        ['s2', 'service'],
      ],
      [
        ['user', 'lb'],
        ['lb', 's1'],
        ['lb', 's2'],
      ],
    )
    const e = run(b, 2, 10, (engine) => engine.setDown(new Set([b.ids.s1])))
    expect(stats(e, b, 's1').handled).toBe(0)
    expect(stats(e, b, 'user').failed).toBe(0)
    expect(stats(e, b, 'user').ok).toBeGreaterThan(10)
  })

  it('a single dead server fails every request', () => {
    const b = board(
      [
        ['user', 'user'],
        ['api', 'service'],
      ],
      [['user', 'api']],
    )
    const e = run(b, 2, 6, (engine) => engine.setDown(new Set([b.ids.api])))
    expect(stats(e, b, 'user').ok).toBe(0)
    expect(stats(e, b, 'user').failed).toBeGreaterThan(5)
  })
})

describe('retries and circuit breaker', () => {
  const flaky = (retries: number) =>
    board(
      [
        ['user', 'user'],
        ['api', 'service', { retries, capacity: 50 }],
        ['pay', 'payment', { failRate: 0.5, capacity: 50 }],
      ],
      [
        ['user', 'api'],
        ['api', 'pay'],
      ],
    )

  it('retries turn a flaky dependency into successes', () => {
    const none = run(flaky(0), 2, 15)
    const three = run(flaky(3), 2, 15)
    const b = flaky(0)
    const failRate = (e: SimEngine) => {
      const s = e.states.get([...e.graph.sources][0])!.stats
      return s.failed / (s.ok + s.failed)
    }
    expect(failRate(none)).toBeGreaterThan(0.4)
    expect(failRate(three)).toBeLessThan(0.1)
    expect(b).toBeTruthy()
  })

  it('a breaker opens after failures and fails fast', () => {
    const b = board(
      [
        ['user', 'user'],
        ['cb', 'circuitBreaker'],
        ['pay', 'payment'],
      ],
      [
        ['user', 'cb'],
        ['cb', 'pay'],
      ],
    )
    const e = run(b, 3, 6, (engine) => engine.setDown(new Set([b.ids.pay])))
    expect(stats(e, b, 'cb').rejected).toBeGreaterThan(5)
    expect(e.states.get(b.ids.cb)!.breaker.mode).not.toBe('closed')
  })
})

describe('replication lag', () => {
  it('reads from a lagging replica come back STALE', () => {
    const b = board(
      [
        ['writer', 'user', { writes: 1 }],
        ['primary', 'sqlDb', { capacity: 50 }],
        ['replica', 'replica', { capacity: 50 }],
        ['reader', 'user'],
      ],
      [
        ['writer', 'primary'],
        ['primary', 'replica'],
        ['reader', 'replica'],
      ],
    )
    const e = run(b, 6, 15)
    expect(e.states.get(b.ids.primary)!.version).toBeGreaterThan(10)
    expect(stats(e, b, 'replica').misses).toBeGreaterThan(0)
    expect(e.states.get(b.ids.replica)!.version).toBeGreaterThan(5)
  })
})

describe('saga and telemetry', () => {
  it('a failed step sends UNDO to the steps that succeeded', () => {
    const b = board(
      [
        ['user', 'user'],
        ['orch', 'service', { compensate: 1, capacity: 50 }],
        ['pay', 'payment', { capacity: 50 }],
        ['stock', 'service', { failRate: 1, capacity: 50 }],
      ],
      [
        ['user', 'orch'],
        ['orch', 'pay'],
        ['orch', 'stock'],
      ],
    )
    const e = new SimEngine(buildSimGraph(b.page))
    const undone: string[] = []
    for (let t = 0; t < 8; t += 0.05) {
      e.advance(0.05)
      for (const tag of e.tags) if (tag.text === 'UNDO') undone.push(tag.text)
    }
    expect(undone.length).toBeGreaterThan(0)
    expect(stats(e, b, 'user').failed).toBeGreaterThan(0)
  })

  it('logs are sent on the side and never slow the request', () => {
    const b = board(
      [
        ['user', 'user'],
        ['api', 'service'],
        ['logs', 'logging'],
      ],
      [
        ['user', 'api'],
        ['api', 'logs'],
      ],
    )
    const e = run(b, 2, 10)
    expect(stats(e, b, 'logs').handled).toBeGreaterThan(5)
    expect(stats(e, b, 'user').failed).toBe(0)
  })
})

describe('step mode', () => {
  it('sends one request and freezes at each block', () => {
    const b = board(
      [
        ['user', 'user'],
        ['api', 'service'],
      ],
      [['user', 'api']],
    )
    const e = new SimEngine(buildSimGraph(b.page))
    e.setStepMode(true)
    e.sendOne()
    for (let i = 0; i < 100; i++) e.advance(0.05)
    expect(e.paused).toBe(true)
    expect(e.focus).toBe(b.ids.api)
    expect(stats(e, b, 'user').sent).toBe(1)
    e.next()
    for (let i = 0; i < 100; i++) {
      e.advance(0.05)
      if (e.paused) e.next()
    }
    expect(stats(e, b, 'user').ok).toBe(1)
  })
})

describe('read/write split', () => {
  it('writes go to the primary, reads to the replicas', () => {
    const b = board(
      [
        ['user', 'user', { writes: 0.3 }],
        ['api', 'service', { capacity: 50 }],
        ['primary', 'sqlDb', { capacity: 50 }],
        ['r1', 'replica', { capacity: 50 }],
      ],
      [
        ['user', 'api'],
        ['api', 'primary'],
        ['api', 'r1'],
        ['primary', 'r1'],
      ],
    )
    const e = run(b, 3, 20)
    const user = stats(e, b, 'user')
    const primary = stats(e, b, 'primary')
    expect(primary.handled / user.sent).toBeCloseTo(0.3, 1)
    expect(user.failed).toBe(0)
  })
})
