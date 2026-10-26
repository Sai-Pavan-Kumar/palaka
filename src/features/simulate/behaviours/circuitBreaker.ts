import type { Behaviour } from './behaviour'

// Consecutive failures that trip the breaker.
const TRIP_AFTER = 3
// Seconds it stays open before letting one test request through.
const COOL_DOWN_S = 3

// Closed: calls pass. Open: calls fail at once ("OPEN"), sparing a sick
// service and the callers waiting on it. Half-open: one test call decides
// whether to close again or stay open. The three states are the lesson.
export const circuitBreaker: Behaviour = {
  tick(_ctx, _node, state, dt) {
    const { breaker } = state
    if (breaker.mode !== 'open') return
    breaker.openFor += dt
    if (breaker.openFor >= COOL_DOWN_S) breaker.mode = 'half-open'
  },
  arrive(ctx, node, state, packet) {
    if (state.breaker.mode === 'open') {
      state.stats.rejected++
      ctx.respond(packet, 'error', 'OPEN')
      return
    }
    state.stats.allowed++
    ctx.proceed(packet, node.id)
  },
  onReturn(_node, state, packet) {
    const { breaker } = state
    if (packet.mode !== 'error') {
      breaker.mode = 'closed'
      breaker.failures = 0
      return
    }
    breaker.failures++
    if (breaker.mode === 'half-open' || breaker.failures >= TRIP_AFTER) {
      breaker.mode = 'open'
      breaker.openFor = 0
    }
  },
}
