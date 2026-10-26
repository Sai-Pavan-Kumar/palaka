import type { Hop, NodeState, Packet, PacketMode, SimNode } from '../simTypes'

// What a behaviour may ask of the engine. Behaviours decide; the engine
// moves packets, so no behaviour ever touches geometry or the route stack.
export type SimContext = {
  // Ways on from this node for this packet (never back, never in a loop).
  outs(packet: Packet, node: string): Hop[]
  // Call these hops in order; with none given, every way on (cache first).
  proceed(packet: Packet, node: string, calls?: Hop[]): void
  respond(packet: Packet, mode: PacketMode, tag?: string): void
  // A fire-and-forget copy that starts at `node` (queue, pub/sub).
  makeAsync(node: string): Packet
  remove(packet: Packet): void
}

export type Behaviour = {
  arrive(ctx: SimContext, node: SimNode, state: NodeState, p: Packet): void
  tick?(ctx: SimContext, node: SimNode, state: NodeState, dt: number): void
}

export function pickRoundRobin(state: NodeState, outs: Hop[]): Hop {
  const hop = outs[state.roundRobin % outs.length]
  state.roundRobin++
  state.stats.routed[hop.to] = (state.stats.routed[hop.to] ?? 0) + 1
  return hop
}
