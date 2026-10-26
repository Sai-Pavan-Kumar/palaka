import { pickRoundRobin, type Behaviour } from './behaviour'

// Round robin: each request goes to the next server in turn, so the split
// is visibly even.
export const loadBalancer: Behaviour = {
  arrive(ctx, node, state, packet) {
    const outs = ctx.outs(packet, node.id)
    if (outs.length === 0) {
      ctx.respond(packet, 'error', '502')
      return
    }
    ctx.proceed(packet, node.id, [pickRoundRobin(state, outs)])
  },
}
