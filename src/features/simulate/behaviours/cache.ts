import type { Behaviour } from './behaviour'

// Hits follow the hit rate exactly instead of a dice roll, so 70% looks
// like 70% on camera and every take of the video plays the same. The
// first request is a miss: a cold cache, which is the true story.
export const cache: Behaviour = {
  arrive(ctx, node, state, packet) {
    state.hitCredit += node.config.hitRate
    if (state.hitCredit >= 1) {
      state.hitCredit -= 1
      state.stats.hits++
      packet.hit = true
      ctx.respond(packet, 'ok', 'HIT')
      return
    }
    state.stats.misses++
    // Read-through: a cache wired to a database fetches on its own.
    // Otherwise (cache-aside) the caller hears MISS and asks the database.
    if (ctx.outs(packet, node.id).length > 0) ctx.proceed(packet, node.id)
    else ctx.respond(packet, 'miss', 'MISS')
  },
}
