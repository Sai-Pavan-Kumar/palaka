import type { SimEngine } from './simEngine'
import type { Hop, Packet } from './simTypes'

// Which downstream calls a node makes, and in what order. Telemetry and
// replication are not calls: they are copies sent on the side, so the
// request never waits for a log line or for a replica to catch up.
// An app wired to both a primary and its replicas sends writes to the
// primary and reads to the replicas: the read/write split.
function splitReadsAndWrites(engine: SimEngine, packet: Packet, calls: Hop[]) {
  const replicas = calls.filter(
    (h) => engine.graph.nodes.get(h.to)?.config.behaviour === 'replica',
  )
  const primaries = calls.filter((h) => engine.isPrimary(h.to))
  if (replicas.length === 0 || primaries.length === 0) return
  const drop = new Set(packet.op === 'write' ? replicas : primaries)
  // Spread reads over the replicas instead of asking every one of them.
  if (packet.op !== 'write') {
    const keep = replicas[packet.id % replicas.length]
    for (const replica of replicas) if (replica !== keep) drop.add(replica)
  }
  for (let i = calls.length - 1; i >= 0; i--) {
    if (drop.has(calls[i])) calls.splice(i, 1)
  }
}

export function planCalls(
  engine: SimEngine,
  packet: Packet,
  nodeId: string,
): Hop[] {
  const behaviourOf = (hop: Hop) =>
    engine.graph.nodes.get(hop.to)?.config.behaviour
  const self = engine.graph.nodes.get(nodeId)?.config
  const isReplica = (hop: Hop) => behaviourOf(hop) === 'replica'
  const isReplication = (hop: Hop) =>
    isReplica(hop) && !!self?.stores && self.behaviour !== 'replica'
  const calls: Hop[] = []
  let replicated = false
  for (const hop of engine.outs(packet, nodeId)) {
    if (behaviourOf(hop) === 'sink') {
      engine.sendCopy(nodeId, hop, packet.op)
    } else if (isReplication(hop)) {
      if (packet.op !== 'write') continue
      engine.sendCopy(nodeId, hop, 'replicate')
      replicated = true
    } else {
      calls.push(hop)
    }
  }
  splitReadsAndWrites(engine, packet, calls)
  // A primary counts the writes it accepted; replicas chase that number.
  const state = engine.states.get(nodeId)
  if (state && (replicated || engine.isPrimary(nodeId))) {
    if (packet.op === 'write') state.version++
  }
  // Check the cache before the database, as a service is usually written.
  const isCache = (hop: Hop) => behaviourOf(hop) === 'cache'
  return calls.sort((a, b) => Number(isCache(b)) - Number(isCache(a)))
}
