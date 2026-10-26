import type { NodeState } from './simTypes'

export function newState(rate: number): NodeState {
  return {
    tokens: rate,
    roundRobin: 0,
    hitCredit: 0,
    drainCredit: 0,
    busy: [],
    backlog: [],
    stats: {
      sent: 0,
      ok: 0,
      failed: 0,
      allowed: 0,
      rejected: 0,
      hits: 0,
      misses: 0,
      handled: 0,
      routed: {},
    },
    version: 0,
    failCredit: 0,
    writeCredit: 0,
    breaker: { mode: 'closed', failures: 0, openFor: 0 },
  }
}
