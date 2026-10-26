import type { Behaviour } from './behaviour'

// Token bucket: `rate` tokens a second, bucket holds one second's worth, so
// a short burst passes and a sustained flood gets 429s.
export const rateLimiter: Behaviour = {
  tick(_ctx, node, state, dt) {
    state.tokens = Math.min(
      node.config.rate,
      state.tokens + node.config.rate * dt,
    )
  },
  arrive(ctx, node, state, packet) {
    if (state.tokens >= 1) {
      state.tokens -= 1
      state.stats.allowed++
      ctx.proceed(packet, node.id)
      return
    }
    state.stats.rejected++
    ctx.respond(packet, 'error', '429')
  },
}
