import { pickRoundRobin, type Behaviour } from './behaviour'

// The sender is answered at once ("queued"); the message waits inside and
// drains at `rate` a second to the consumers in turn. When the queue is
// full, new messages are refused: back-pressure the viewer can see.
export const queue: Behaviour = {
  arrive(ctx, node, state, packet) {
    if (state.backlog.length >= node.config.size) {
      state.stats.rejected++
      ctx.respond(packet, 'error', 'Full')
      return
    }
    state.stats.allowed++
    state.backlog.push({ packet: ctx.makeAsync(node.id), waited: 0 })
    ctx.respond(packet, 'ok')
  },
  tick(ctx, node, state, dt) {
    if (state.backlog.length === 0) {
      state.drainCredit = Math.min(1, state.drainCredit)
      return
    }
    state.drainCredit += node.config.rate * dt
    while (state.drainCredit >= 1 && state.backlog.length > 0) {
      state.drainCredit -= 1
      const { packet } = state.backlog.shift()!
      state.stats.handled++
      const outs = ctx.outs(packet, node.id)
      if (outs.length === 0) ctx.remove(packet)
      else ctx.proceed(packet, node.id, [pickRoundRobin(state, outs)])
    }
  },
}

// Every subscriber gets its own copy; the publisher is answered at once.
export const pubSub: Behaviour = {
  arrive(ctx, node, state, packet) {
    for (const hop of ctx.outs(packet, node.id)) {
      ctx.proceed(ctx.makeAsync(node.id), node.id, [hop])
    }
    state.stats.handled++
    ctx.respond(packet, 'ok')
  },
}
