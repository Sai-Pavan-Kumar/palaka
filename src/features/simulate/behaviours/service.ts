import type { Behaviour } from './behaviour'

// Requests wait this long in line before the caller gives up.
const TIMEOUT_S = 4
// Beyond capacity × this many waiting, new requests are turned away.
const BACKLOG_FACTOR = 6

// A server works on `capacity` requests at once, each for `serviceTime`.
// More traffic than that forms a line (latency grows), then times out
// (504), then is refused (503): the three ways overload shows up for real.
export const service: Behaviour = {
  arrive(ctx, node, state, packet) {
    const { capacity, serviceTime } = node.config
    if (state.busy.length < capacity) {
      state.busy.push({ packet, left: serviceTime })
    } else if (state.backlog.length < capacity * BACKLOG_FACTOR) {
      state.backlog.push({ packet, waited: 0 })
    } else {
      state.stats.rejected++
      ctx.respond(packet, 'error', '503')
    }
  },
  tick(ctx, node, state, dt) {
    for (const item of state.backlog) item.waited += dt
    while (state.backlog.length > 0 && state.backlog[0].waited > TIMEOUT_S) {
      state.stats.rejected++
      ctx.respond(state.backlog.shift()!.packet, 'error', '504')
    }
    const done = []
    for (const item of state.busy) {
      item.left -= dt
      if (item.left <= 0) done.push(item)
    }
    state.busy = state.busy.filter((item) => item.left > 0)
    while (
      state.busy.length < node.config.capacity &&
      state.backlog.length > 0
    ) {
      const { packet } = state.backlog.shift()!
      state.busy.push({ packet, left: node.config.serviceTime })
    }
    for (const { packet } of done) {
      state.stats.handled++
      ctx.proceed(packet, node.id)
    }
  },
}

// Sources and plain hops: no work of their own, the request just goes on.
export const passThrough: Behaviour = {
  arrive(ctx, node, _state, packet) {
    ctx.proceed(packet, node.id)
  },
}
