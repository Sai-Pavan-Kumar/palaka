import type { NodeState, Packet, SimNode } from '../simTypes'
import type { Behaviour, SimContext } from './behaviour'

// Requests wait this long in line before the caller gives up.
const TIMEOUT_S = 4
// Beyond capacity × this many waiting, new requests are turned away.
const BACKLOG_FACTOR = 6

type OnDone = (
  ctx: SimContext,
  node: SimNode,
  state: NodeState,
  packet: Packet,
) => void

// A server works on `capacity` requests at once, each for `serviceTime`.
// More traffic than that forms a line (latency grows), then times out
// (504), then is refused (503): the three ways overload shows up for real.
// What happens once the work is done differs per kind of server.
function makeWorker(onDone: OnDone): Behaviour {
  return {
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
        onDone(ctx, node, state, packet)
      }
    },
  }
}

// A flaky dependency fails a fixed share of requests, spread evenly (an
// accumulator, not dice), so a retry demo looks the same on every take.
export const service = makeWorker((ctx, node, state, packet) => {
  state.failCredit += node.config.failRate
  if (state.failCredit >= 1) {
    state.failCredit -= 1
    ctx.respond(packet, 'error', '500')
    return
  }
  ctx.proceed(packet, node.id)
})

// A replica applies copied writes and serves reads. A read that arrives
// before the latest write has been copied answers with old data: STALE.
// That gap is eventual consistency, made visible.
export const replica = makeWorker((ctx, node, state, packet) => {
  if (packet.op === 'replicate') {
    state.version++
    ctx.remove(packet)
    return
  }
  if (packet.op === 'write') {
    ctx.respond(packet, 'error', 'READ ONLY')
    return
  }
  const primary = ctx.primaryVersion(node.id)
  if (primary !== null && primary > state.version) {
    state.stats.misses++
    ctx.respond(packet, 'miss', 'STALE')
    return
  }
  state.stats.hits++
  ctx.proceed(packet, node.id)
})

// Sources and plain hops: no work of their own, the request just goes on.
export const passThrough: Behaviour = {
  arrive(ctx, node, _state, packet) {
    ctx.proceed(packet, node.id)
  },
}

// Logs, metrics, traces: they only count what arrives; nothing answers.
export const sink: Behaviour = {
  arrive(ctx, _node, state, packet) {
    state.stats.handled++
    ctx.remove(packet)
  },
}
