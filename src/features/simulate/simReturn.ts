import { BEHAVIOURS } from './behaviours'
import type { SimEngine } from './simEngine'
import type { Frame, Packet } from './simTypes'

// Retry the same call: the caller's own setting, counted per call.
function tryRetry(engine: SimEngine, packet: Packet, frame: Frame): boolean {
  const retries = engine.graph.nodes.get(frame.node)?.config.retries ?? 0
  if (!frame.last || frame.attempts >= retries) return false
  frame.attempts++
  engine.tag(frame.node, `RETRY ${frame.attempts}`, 'miss')
  packet.mode = packet.oneWay ? 'async' : 'request'
  engine.ride(packet, frame.last, false)
  return true
}

// Saga: a later step failed, so every step that already succeeded gets an
// undo message ("refund the payment, release the stock").
function compensate(engine: SimEngine, frame: Frame): void {
  if (!engine.graph.nodes.get(frame.node)?.config.compensate) return
  for (const hop of frame.done) {
    const undo = engine.makeAsync(frame.node)
    undo.compensate = true
    engine.proceed(undo, frame.node, [hop])
  }
  frame.done = []
}

export function unwind(engine: SimEngine, packet: Packet): void {
  const frame = packet.stack.pop()!
  if (packet.stack.length === 0 || !frame.via) {
    const stats = engine.states.get(frame.node)?.stats
    if (stats && packet.mode === 'error') stats.failed++
    else if (stats) stats.ok++
    engine.remove(packet)
    return
  }
  engine.ride(packet, frame.via, true)
}

// A response reached the caller. A breaker on the way counts it; an error
// is retried, then undone (saga), then passed further back. A cache hit
// answers for the database, so the caller skips that call.
export function backAt(engine: SimEngine, packet: Packet): void {
  const frame = packet.stack[packet.stack.length - 1]
  const node = engine.graph.nodes.get(frame.node)
  const state = engine.states.get(frame.node)
  if (node && state) {
    BEHAVIOURS[node.config.behaviour].onReturn?.(node, state, packet)
  }
  engine.pauseAt(frame.node)
  if (packet.mode === 'error') {
    if (tryRetry(engine, packet, frame)) return
    compensate(engine, frame)
    unwind(engine, packet)
    return
  }
  if (frame.last) frame.done.push(frame.last)
  if (packet.hit) {
    frame.pending = []
    packet.hit = false
  }
  if (frame.pending.length > 0) {
    packet.mode = packet.oneWay ? 'async' : 'request'
    engine.callNext(packet)
    return
  }
  packet.mode = 'ok'
  unwind(engine, packet)
}
