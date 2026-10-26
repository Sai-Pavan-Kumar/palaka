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
  // Taken down by the teacher: refuses everything, balancers skip it.
  isDown(node: string): boolean
  // Writes the primary of this replica has applied; null without one.
  primaryVersion(replica: string): number | null
  // A floating label over a node (UNDO, STALE…).
  tag(node: string, text: string, mode: PacketMode): void
}

export type Behaviour = {
  arrive(ctx: SimContext, node: SimNode, state: NodeState, p: Packet): void
  tick?(ctx: SimContext, node: SimNode, state: NodeState, dt: number): void
  // A response passing back through this node (circuit breaker counts it).
  onReturn?(node: SimNode, state: NodeState, p: Packet): void
}

export function pickRoundRobin(state: NodeState, outs: Hop[]): Hop {
  const hop = outs[state.roundRobin % outs.length]
  state.roundRobin++
  state.stats.routed[hop.to] = (state.stats.routed[hop.to] ?? 0) + 1
  return hop
}
