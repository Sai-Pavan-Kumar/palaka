import { describe, expect, it } from 'vitest'
import { buildSimGraph } from './simGraph'
import { MAX_PACKETS } from './simEngine'
import { board, run, stats } from './testBoard'

describe('simGraph', () => {
  it('arrows are one way, plain lines both ways, clients are sources', () => {
    const b = board(
      [
        ['user', 'user'],
        ['api', 'service'],
        ['db', 'sqlDb'],
      ],
      [
        ['user', 'api'],
        ['api', 'db', false],
      ],
    )
    const graph = buildSimGraph(b.page)
    expect(graph.sources).toEqual([b.ids.user])
    expect(graph.hops.get(b.ids.api)?.map((h) => h.to)).toEqual([b.ids.db])
    expect(graph.hops.get(b.ids.db)?.map((h) => h.to)).toEqual([b.ids.api])
  })
})

describe('SimEngine', () => {
  it('lets a request travel and come back', () => {
    const b = board(
      [
        ['user', 'user'],
        ['api', 'service'],
      ],
      [['user', 'api']],
    )
    const e = run(b, 1, 6)
    expect(stats(e, b, 'user').ok).toBeGreaterThan(4)
    expect(stats(e, b, 'user').failed).toBe(0)
  })

  it('rate limiter answers 429 once traffic beats its rate', () => {
    const b = board(
      [
        ['user', 'user'],
        ['rl', 'rateLimiter', { rate: 3 }],
        ['api', 'service', { capacity: 50 }],
      ],
      [
        ['user', 'rl'],
        ['rl', 'api'],
      ],
    )
    const calm = run(b, 1, 10)
    expect(stats(calm, b, 'rl').rejected).toBe(0)
    const flood = run(b, 10, 10)
    expect(stats(flood, b, 'rl').rejected).toBeGreaterThan(80)
    expect(stats(flood, b, 'rl').allowed).toBeLessThan(40)
  })

  it('load balancer splits evenly', () => {
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
    const routed = stats(run(b, 4, 10), b, 'lb').routed
    expect(Math.abs(routed[b.ids.s1] - routed[b.ids.s2])).toBeLessThanOrEqual(1)
  })

  it('cache-aside: hits skip the database, misses reach it', () => {
    const b = board(
      [
        ['user', 'user'],
        ['api', 'service', { capacity: 50 }],
        ['cache', 'cache', { hitRate: 0.7 }],
        ['db', 'sqlDb', { capacity: 50 }],
      ],
      [
        ['user', 'api'],
        ['api', 'cache'],
        ['api', 'db'],
      ],
    )
    const e = run(b, 2, 20)
    const cache = stats(e, b, 'cache')
    const db = stats(e, b, 'db')
    expect(cache.hits / (cache.hits + cache.misses)).toBeCloseTo(0.7, 1)
    // A few misses are still on their way to the database at the cut-off.
    expect(db.handled).toBeLessThanOrEqual(cache.misses)
    expect(db.handled).toBeGreaterThanOrEqual(cache.misses - 5)
  })

  it('a full queue refuses, and drains to its consumer', () => {
    const b = board(
      [
        ['user', 'user'],
        ['q', 'queue', { size: 5, rate: 1 }],
        ['worker', 'worker'],
      ],
      [
        ['user', 'q'],
        ['q', 'worker'],
      ],
    )
    const e = run(b, 6, 10)
    expect(stats(e, b, 'q').rejected).toBeGreaterThan(0)
    expect(stats(e, b, 'worker').handled).toBeGreaterThan(5)
    expect(e.states.get(b.ids.q)!.backlog.length).toBeLessThanOrEqual(5)
  })

  it('an overloaded database turns requests away', () => {
    const b = board(
      [
        ['user', 'user'],
        ['db', 'sqlDb', { capacity: 1 }],
      ],
      [['user', 'db']],
    )
    const e = run(b, 10, 15)
    expect(stats(e, b, 'db').rejected).toBeGreaterThan(0)
    expect(stats(e, b, 'user').failed).toBeGreaterThan(0)
  })

  it('a loop drawn by accident never runs away', () => {
    const b = board(
      [
        ['user', 'user'],
        ['a', 'gateway'],
        ['b', 'gateway'],
      ],
      [
        ['user', 'a'],
        ['a', 'b'],
        ['b', 'a'],
      ],
    )
    const e = run(b, 10, 20)
    expect(e.packets.length).toBeLessThanOrEqual(MAX_PACKETS)
    expect(stats(e, b, 'user').ok).toBeGreaterThan(100)
  })

  it('every request is accounted for', () => {
    const b = board(
      [
        ['user', 'user'],
        ['rl', 'rateLimiter'],
        ['api', 'service'],
      ],
      [
        ['user', 'rl'],
        ['rl', 'api'],
      ],
    )
    const e = run(b, 7, 12)
    const user = stats(e, b, 'user')
    const live = e.packets.filter((p) => !p.oneWay).length
    expect(user.ok + user.failed + live).toBe(user.sent)
  })
})
