import { pickRoundRobin, type Behaviour } from './behaviour'

// Round robin over healthy servers only: the health check is why taking a
// server down costs nothing but capacity (failover).
export const loadBalancer: Behaviour = {
  arrive(ctx, node, state, packet) {
    const outs = ctx.outs(packet, node.id).filter((h) => !ctx.isDown(h.to))
    if (outs.length === 0) {
      ctx.respond(packet, 'error', '502')
      return
    }
    ctx.proceed(packet, node.id, [pickRoundRobin(state, outs)])
  },
}
