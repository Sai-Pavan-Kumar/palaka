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
  | 'breaker'
  | 'replica'
  | 'sink'

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
  // Caller: extra attempts after a failed call.
  retries: number
  // Service: share of requests that fail (a flaky dependency).
  failRate: number
  // Source: share of requests that are writes, not reads.
  writes: number
  // Service: on failure, undo the steps that already succeeded (saga).
  compensate: boolean
  // A database (or table): the only kind that can be a primary.
  stores: boolean
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
  // Replica → the primary it copies; stale reads compare the two.
  primaryOf: Map<string, string>
  // Changes only when nodes, edges or behaviours change, not on a move.
  signature: string
}

export type PacketMode = 'request' | 'ok' | 'miss' | 'error' | 'async'

// One call on the packet's route: the node, the hop that reached it, and
// the downstream calls it still has to make before it can answer.
// `last` and `attempts` drive retries; `done` lists calls that succeeded,
// which a saga undoes when a later step fails.
export type Frame = {
  node: string
  via: Hop | null
  pending: Hop[]
  last: Hop | null
  attempts: number
  done: Hop[]
}

// Reads and writes travel the same roads; only replicas and primaries care.
export type PacketOp = 'read' | 'write' | 'replicate'

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
  op: PacketOp
  // Saga undo message: shows UNDO where it lands, then disappears.
  compensate: boolean
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
  // Writes applied: a primary counts them, a replica catches up to it.
  version: number
  failCredit: number
  writeCredit: number
  breaker: BreakerState
}

export type BreakerState = {
  mode: 'closed' | 'open' | 'half-open'
  failures: number
  // Seconds since the breaker opened.
  openFor: number
}
