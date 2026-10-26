import type { SimContext } from './behaviours/behaviour'
import { BEHAVIOURS } from './behaviours'
import { planCalls } from './simCalls'
import { backAt, unwind } from './simReturn'
import { newState } from './simState'
import type {
  Hop,
  NodeState,
  Packet,
  PacketMode,
  PacketOp,
  SimGraph,
  Tag,
} from './simTypes'

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
export const TAG_LIFE_S = 1.1
// A repeat tag restarts only once the old one has risen out of the way.
const TAG_REFRESH_S = 0.5

export class SimEngine implements SimContext {
  graph: SimGraph
  packets: Packet[] = []
  tags: Tag[] = []
  states = new Map<string, NodeState>()
  traffic = 1
  // Blocks the teacher took down (failover, CAP, chaos demos).
  down = new Set<string>()
  // Step mode: no automatic traffic, and the run freezes at every block.
  stepMode = false
  paused = false
  // The block the step froze at, ringed on the board.
  focus: string | null = null
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
    this.paused = false
    this.focus = null
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

  setDown(ids: ReadonlySet<string>): void {
    this.down = new Set(ids)
  }

  setStepMode(on: boolean): void {
    this.stepMode = on
    this.next()
  }

  next(): void {
    this.paused = false
    this.focus = null
  }

  // Step mode's "send one": exactly one request from the next client.
  sendOne(): void {
    const { sources } = this.graph
    if (sources.length > 0)
      this.launch(sources[this.sourceTurn++ % sources.length])
  }

  advance(seconds: number): void {
    this.leftover += Math.min(seconds, 0.25)
    while (this.leftover >= STEP_S && !this.paused) {
      this.leftover -= STEP_S
      this.step(STEP_S)
    }
    if (this.paused) this.leftover = 0
  }

  pauseAt(node: string): void {
    if (!this.stepMode) return
    this.paused = true
    this.focus = node
  }

  private step(dt: number): void {
    if (!this.stepMode) this.spawn(dt)
    for (const node of this.graph.nodes.values()) {
      const state = this.states.get(node.id)!
      BEHAVIOURS[node.config.behaviour].tick?.(this, node, state, dt)
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
      this.launch(sources[this.sourceTurn++ % sources.length])
    }
  }

  // Writes follow the client's write share exactly (an accumulator), so a
  // 30% writer sends 3 writes in every 10 requests, on every take.
  private launch(source: string): void {
    if (this.packets.length >= MAX_PACKETS) return
    const state = this.states.get(source)!
    state.writeCredit += this.graph.nodes.get(source)?.config.writes ?? 0
    const isWrite = state.writeCredit >= 1
    if (isWrite) state.writeCredit -= 1
    const packet = this.create(
      source,
      'request',
      false,
      isWrite ? 'write' : 'read',
    )
    state.stats.sent++
    this.arrive(packet, source)
  }

  private create(
    node: string,
    mode: PacketMode,
    oneWay: boolean,
    op: PacketOp,
  ): Packet {
    const packet: Packet = {
      id: this.nextId++,
      mode,
      stack: [
        { node, via: null, pending: [], last: null, attempts: 0, done: [] },
      ],
      hop: null,
      returning: false,
      distance: 0,
      oneWay,
      hit: false,
      op,
      compensate: false,
    }
    this.packets.push(packet)
    return packet
  }

  private move(packet: Packet, dt: number): void {
    const { hop } = packet
    if (!hop || this.paused) return
    packet.distance += PACKET_SPEED * dt
    if (packet.distance < hop.edge.length) return
    packet.hop = null
    if (packet.returning) backAt(this, packet)
    else this.forwardAt(packet, hop)
  }

  ride(packet: Packet, hop: Hop, returning: boolean): void {
    packet.hop = hop
    packet.returning = returning
    packet.distance = 0
  }

  private forwardAt(packet: Packet, hop: Hop): void {
    packet.stack.push({
      node: hop.to,
      via: hop,
      pending: [],
      last: null,
      attempts: 0,
      done: [],
    })
    if (packet.stack.length > MAX_HOPS) {
      this.respond(packet, 'error', 'Loop')
      return
    }
    this.pauseAt(hop.to)
    this.arrive(packet, hop.to)
  }

  private arrive(packet: Packet, nodeId: string): void {
    const node = this.graph.nodes.get(nodeId)
    const state = this.states.get(nodeId)
    if (!node || !state) return this.remove(packet)
    if (packet.compensate) {
      this.tag(nodeId, 'UNDO', 'async')
      return this.remove(packet)
    }
    if (this.down.has(nodeId)) return this.respond(packet, 'error', 'DOWN')
    BEHAVIOURS[node.config.behaviour].arrive(this, node, state, packet)
  }

  callNext(packet: Packet): void {
    const frame = packet.stack[packet.stack.length - 1]
    const hop = frame.pending.shift()
    if (!hop) return this.respond(packet, 'ok')
    frame.last = hop
    frame.attempts = 0
    this.ride(packet, hop, false)
  }

  outs(packet: Packet, nodeId: string): Hop[] {
    const frame = packet.stack[packet.stack.length - 1]
    const visited = new Set(packet.stack.map((f) => f.node))
    return (this.graph.hops.get(nodeId) ?? []).filter(
      (hop) => hop.edge !== frame.via?.edge && !visited.has(hop.to),
    )
  }

  proceed(packet: Packet, nodeId: string, calls?: Hop[]): void {
    packet.stack[packet.stack.length - 1].pending =
      calls ?? planCalls(this, packet, nodeId)
    this.callNext(packet)
  }

  sendCopy(nodeId: string, hop: Hop, op: PacketOp): void {
    const copy = this.makeAsync(nodeId)
    copy.op = op
    this.proceed(copy, nodeId, [hop])
  }

  respond(packet: Packet, mode: PacketMode, tag?: string): void {
    const frame = packet.stack[packet.stack.length - 1]
    if (tag) this.tag(frame.node, tag, mode)
    if (packet.oneWay) return this.remove(packet)
    packet.mode = mode
    unwind(this, packet)
  }

  // Under a flood the same "429" would stack into an unreadable smear, so
  // a repeat only lifts the label that is already floating.
  tag(nodeId: string, text: string, mode: PacketMode): void {
    const box = this.graph.nodes.get(nodeId)?.box
    if (!box) return
    const x = box.x + box.w / 2
    const live = this.tags.find((t) => t.x === x && t.text === text)
    if (live && live.age > TAG_REFRESH_S) live.age = 0
    else if (!live) this.tags.push({ x, y: box.y, text, mode, age: 0 })
  }

  makeAsync(node: string): Packet {
    return this.create(node, 'async', true, 'read')
  }

  remove(packet: Packet): void {
    this.packets = this.packets.filter((p) => p !== packet)
  }

  isDown(node: string): boolean {
    return this.down.has(node)
  }

  isPrimary(node: string): boolean {
    return [...this.graph.primaryOf.values()].includes(node)
  }

  primaryVersion(replica: string): number | null {
    const primary = this.graph.primaryOf.get(replica)
    return primary ? (this.states.get(primary)?.version ?? 0) : null
  }
}
