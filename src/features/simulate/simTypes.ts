import type { Point } from '../engine/model/types'

export type BehaviourKind =
  | 'source'
  | 'limiter'
  | 'balancer'
  | 'cache'
  | 'queue'
  | 'pubsub'
  | 'service'
  | 'pass'

// Numbers a behaviour runs on, after the teacher's overrides.
export type NodeConfig = {
  behaviour: BehaviourKind
  // Limiter: requests allowed per second. Queue: messages drained per second.
  rate: number
  hitRate: number
  // Service: requests worked on at the same time.
  capacity: number
  // Queue: messages it can hold.
  size: number
  // Service: seconds one request takes.
  serviceTime: number
}

export type SimNode = {
  id: string
  label: string
  box: { x: number; y: number; w: number; h: number }
  config: NodeConfig
}

// One connector, sampled into a polyline so packets can ride curves too.
export type SimEdge = {
  id: string
  points: Point[]
  // Running length at each point; the last entry is the full length.
  cumulative: number[]
  length: number
}

// A way out of a node: which edge, which way along it, where it lands.
export type Hop = { edge: SimEdge; reverse: boolean; to: string }

export type SimGraph = {
  nodes: Map<string, SimNode>
  hops: Map<string, Hop[]>
  sources: string[]
  // Changes only when nodes, edges or behaviours change, not on a move.
  signature: string
}

export type PacketMode = 'request' | 'ok' | 'miss' | 'error' | 'async'

// One call on the packet's route: the node, the hop that reached it, and
// the downstream calls it still has to make before it can answer.
export type Frame = { node: string; via: Hop | null; pending: Hop[] }

export type Packet = {
  id: number
  mode: PacketMode
  stack: Frame[]
  // Riding this hop now; null while a node holds it.
  hop: Hop | null
  // Travelling back along `hop` (a response) instead of forward.
  returning: boolean
  distance: number
  // Async copies (queue, pub/sub) never answer anyone.
  oneWay: boolean
  // The answer came from a cache, so the caller skips its database call.
  hit: boolean
}

export type Tag = {
  x: number
  y: number
  text: string
  mode: PacketMode
  age: number
}

export type NodeStats = {
  sent: number
  ok: number
  failed: number
  allowed: number
  rejected: number
  hits: number
  misses: number
  handled: number
  routed: Record<string, number>
}

export type NodeState = {
  tokens: number
  roundRobin: number
  hitCredit: number
  drainCredit: number
  busy: { packet: Packet; left: number }[]
  backlog: { packet: Packet; waited: number }[]
  stats: NodeStats
}
