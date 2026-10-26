import type { Behaviour, SimContext } from './behaviours/behaviour'
import { cache } from './behaviours/cache'
import { loadBalancer } from './behaviours/loadBalancer'
import { pubSub, queue } from './behaviours/queue'
import { rateLimiter } from './behaviours/rateLimiter'
import { passThrough, service } from './behaviours/service'
import type {
  BehaviourKind,
  Hop,
  NodeState,
  Packet,
  PacketMode,
  SimGraph,
  SimNode,
  Tag,
} from './simTypes'

const BEHAVIOURS: Record<BehaviourKind, Behaviour> = {
  source: passThrough,
  pass: passThrough,
  limiter: rateLimiter,
  balancer: loadBalancer,
  cache,
  queue,
  pubsub: pubSub,
  service,
}

// Fixed steps keep a run identical on a fast and a slow laptop.
const STEP_S = 1 / 60
// Slide pixels per second: quick enough to feel live, slow enough to follow.
const PACKET_SPEED = 420
// Requests per second at traffic 1×; the slider multiplies it.
const BASE_RATE = 1.5
// A route deeper than this is a loop someone drew by accident.
const MAX_HOPS = 12
// Beyond this the board becomes noise, and old laptops drop frames.
export const MAX_PACKETS = 160
const TAG_LIFE_S = 1.1
// A repeat tag restarts only once the old one has risen out of the way.
const TAG_REFRESH_S = 0.5

function newState(rate: number): NodeState {
  return {
    tokens: rate,
    roundRobin: 0,
    hitCredit: 0,
    drainCredit: 0,
    busy: [],
    backlog: [],
    stats: {
      sent: 0,
      ok: 0,
      failed: 0,
      allowed: 0,
      rejected: 0,
      hits: 0,
      misses: 0,
      handled: 0,
      routed: {},
    },
  }
}

export class SimEngine implements SimContext {
  graph: SimGraph
  packets: Packet[] = []
  tags: Tag[] = []
  states = new Map<string, NodeState>()
  traffic = 1
  private nextId = 1
  private spawnCredit = 0
  private sourceTurn = 0
  private leftover = 0

  constructor(graph: SimGraph) {
    this.graph = graph
    this.reset()
  }

  reset(): void {
    this.packets = []
    this.tags = []
    this.spawnCredit = 0
    this.states = new Map(
      [...this.graph.nodes.values()].map((n) => [
        n.id,
        newState(n.config.rate),
      ]),
    )
  }

  // Moving a block mid-run only bends the roads. Anything structural (a
  // block revealed, an arrow drawn, a number changed) clears the packets,
  // whose routes may no longer exist, but blocks keep their counters.
  setGraph(graph: SimGraph): void {
    if (graph.signature !== this.graph.signature) {
      const kept = this.states
      this.graph = graph
      this.reset()
      for (const id of this.states.keys()) {
        const old = kept.get(id)
        if (old) this.states.set(id, { ...old, busy: [], backlog: [] })
      }
      return
    }
    const edges = new Map(
      [...graph.hops.values()].flat().map((h) => [h.edge.id, h.edge]),
    )
    for (const hop of [...this.graph.hops.values()].flat()) {
      hop.edge = edges.get(hop.edge.id) ?? hop.edge
    }
    this.graph = { ...this.graph, nodes: graph.nodes }
  }

  setTraffic(traffic: number): void {
    this.traffic = traffic
  }

  advance(seconds: number): void {
    this.leftover += Math.min(seconds, 0.25)
    while (this.leftover >= STEP_S) {
      this.leftover -= STEP_S
      this.step(STEP_S)
    }
  }

  private step(dt: number): void {
    this.spawn(dt)
    for (const node of this.graph.nodes.values()) {
      BEHAVIOURS[node.config.behaviour].tick?.(
        this,
        node,
        this.states.get(node.id)!,
        dt,
      )
    }
    for (const packet of [...this.packets]) this.move(packet, dt)
    for (const tag of this.tags) tag.age += dt
    this.tags = this.tags.filter((tag) => tag.age < TAG_LIFE_S)
  }

  private spawn(dt: number): void {
    const { sources } = this.graph
    if (sources.length === 0) return
    this.spawnCredit += BASE_RATE * this.traffic * dt
    while (this.spawnCredit >= 1) {
      this.spawnCredit -= 1
      if (this.packets.length >= MAX_PACKETS) continue
      const source = sources[this.sourceTurn++ % sources.length]
      const packet = this.create(source, 'request', false)
      this.states.get(source)!.stats.sent++
      this.arrive(packet, source)
    }
  }

  private create(node: string, mode: PacketMode, oneWay: boolean): Packet {
    const packet: Packet = {
      id: this.nextId++,
      mode,
      stack: [{ node, via: null, pending: [] }],
      hop: null,
      returning: false,
      distance: 0,
      oneWay,
      hit: false,
    }
    this.packets.push(packet)
    return packet
  }

  private move(packet: Packet, dt: number): void {
    const { hop } = packet
    if (!hop) return
    packet.distance += PACKET_SPEED * dt
    if (packet.distance < hop.edge.length) return
    packet.hop = null
    if (packet.returning) this.backAt(packet)
    else this.forwardAt(packet, hop)
  }

  private ride(packet: Packet, hop: Hop, returning: boolean): void {
    packet.hop = hop
    packet.returning = returning
    packet.distance = 0
  }

  private forwardAt(packet: Packet, hop: Hop): void {
    packet.stack.push({ node: hop.to, via: hop, pending: [] })
    if (packet.stack.length > MAX_HOPS) {
      this.respond(packet, 'error', 'Loop')
      return
    }
    this.arrive(packet, hop.to)
  }

  private arrive(packet: Packet, nodeId: string): void {
    const node = this.graph.nodes.get(nodeId)
    const state = this.states.get(nodeId)
    if (!node || !state) return this.remove(packet)
    BEHAVIOURS[node.config.behaviour].arrive(this, node, state, packet)
  }

  // A response reached the caller. A cache hit answers for the database,
  // so the caller skips it; an error ends the whole request.
  private backAt(packet: Packet): void {
    const frame = packet.stack[packet.stack.length - 1]
    if (packet.mode === 'error') return this.unwind(packet)
    if (packet.hit) {
      frame.pending = []
      packet.hit = false
    }
    if (frame.pending.length > 0) {
      packet.mode = packet.oneWay ? 'async' : 'request'
      this.callNext(packet)
      return
    }
    packet.mode = 'ok'
    this.unwind(packet)
  }

  private unwind(packet: Packet): void {
    const frame = packet.stack.pop()!
    if (packet.stack.length === 0 || !frame.via) {
      this.finish(packet, frame.node)
      return
    }
    this.ride(packet, frame.via, true)
  }

  private finish(packet: Packet, node: string): void {
    const stats = this.states.get(node)?.stats
    if (stats) {
      if (packet.mode === 'error') stats.failed++
      else stats.ok++
    }
    this.remove(packet)
  }

  private callNext(packet: Packet): void {
    const frame = packet.stack[packet.stack.length - 1]
    const hop = frame.pending.shift()
    if (hop) this.ride(packet, hop, false)
    else this.respond(packet, 'ok')
  }

  outs(packet: Packet, nodeId: string): Hop[] {
    const frame = packet.stack[packet.stack.length - 1]
    const visited = new Set(packet.stack.map((f) => f.node))
    return (this.graph.hops.get(nodeId) ?? []).filter(
      (hop) => hop.edge !== frame.via?.edge && !visited.has(hop.to),
    )
  }

  // Default call order puts caches first: check the cache, then the
  // database, which is how a service is usually written.
  proceed(packet: Packet, nodeId: string, calls?: Hop[]): void {
    const isCache = (hop: Hop) =>
      this.graph.nodes.get(hop.to)?.config.behaviour === 'cache'
    const ordered =
      calls ??
      [...this.outs(packet, nodeId)].sort(
        (a, b) => Number(isCache(b)) - Number(isCache(a)),
      )
    packet.stack[packet.stack.length - 1].pending = ordered
    this.callNext(packet)
  }

  respond(packet: Packet, mode: PacketMode, tag?: string): void {
    const node = this.graph.nodes.get(
      packet.stack[packet.stack.length - 1].node,
    )
    if (tag && node) this.showTag(node.box, tag, mode)
    if (packet.oneWay) return this.remove(packet)
    packet.mode = mode
    this.unwind(packet)
  }

  // Under a flood the same "429" would stack into an unreadable smear, so
  // a repeat only lifts the label that is already floating.
  private showTag(box: SimNode['box'], text: string, mode: PacketMode): void {
    const x = box.x + box.w / 2
    const live = this.tags.find((t) => t.x === x && t.text === text)
    if (live && live.age > TAG_REFRESH_S) live.age = 0
    else if (!live) this.tags.push({ x, y: box.y, text, mode, age: 0 })
  }

  makeAsync(node: string): Packet {
    return this.create(node, 'async', true)
  }

  remove(packet: Packet): void {
    this.packets = this.packets.filter((p) => p !== packet)
  }
}
