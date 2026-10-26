import { isBindable } from '../engine/model/connectors'
import { getTableBox } from '../engine/model/tableBox'
import type { LineShape, Page, Shape } from '../engine/model/types'
import { getNodeConfig } from './behaviours/nodeConfig'
import { toSimEdge } from './pathGeometry'
import type { Hop, SimEdge, SimGraph, SimNode } from './simTypes'

function labelOf(shape: Shape): string {
  if (shape.type === 'block') return shape.label
  if (shape.type === 'table') return shape.name
  return ''
}

function toNode(shape: Shape): SimNode | null {
  if (!isBindable(shape)) return null
  const { x, y, w, h } = shape.type === 'table' ? getTableBox(shape) : shape
  return {
    id: shape.id,
    label: labelOf(shape),
    box: { x, y, w, h },
    config: getNodeConfig(shape),
  }
}

// Which way a request may travel. An arrow points the way; a plain line
// or a two-way flow carries traffic both ways.
function directions(line: LineShape): { forward: boolean; back: boolean } {
  const flow = line.flow?.direction
  if (!line.arrowhead || flow === 'both') return { forward: true, back: true }
  if (flow === 'backward') return { forward: false, back: true }
  return { forward: true, back: false }
}

function addHop(hops: Map<string, Hop[]>, from: string, hop: Hop): void {
  const list = hops.get(from) ?? []
  list.push(hop)
  hops.set(from, list)
}

// Sources are the clients. A diagram with no client block still runs:
// whatever nothing points into starts the traffic.
function findSources(nodes: Map<string, SimNode>, hops: Map<string, Hop[]>) {
  const withOut = [...nodes.values()].filter((n) => hops.has(n.id))
  const clients = withOut.filter((n) => n.config.behaviour === 'source')
  if (clients.length > 0) return clients.map((n) => n.id)
  const reached = new Set(
    [...hops.values()].flatMap((list) => list.map((h) => h.to)),
  )
  return withOut.filter((n) => !reached.has(n.id)).map((n) => n.id)
}

export function buildSimGraph(
  page: Page,
  isVisible: (shape: Shape) => boolean = () => true,
): SimGraph {
  const nodes = new Map<string, SimNode>()
  const hops = new Map<string, Hop[]>()
  const parts: string[] = []
  for (const id of page.order) {
    const shape = page.shapes[id]
    if (!isVisible(shape)) continue
    const node = toNode(shape)
    if (!node) continue
    nodes.set(id, node)
    parts.push(`${id}:${JSON.stringify(node.config)}`)
  }
  for (const id of page.order) {
    const line = page.shapes[id]
    if (line.type !== 'line' || !isVisible(line)) continue
    const from = line.startBinding?.shapeId
    const to = line.endBinding?.shapeId
    if (!from || !to || from === to || !nodes.has(from) || !nodes.has(to)) {
      continue
    }
    const edge: SimEdge = toSimEdge(line)
    const { forward, back } = directions(line)
    if (forward) addHop(hops, from, { edge, reverse: false, to })
    if (back) addHop(hops, to, { edge, reverse: true, to: from })
    parts.push(`${id}:${from}>${to}:${forward}${back}`)
  }
  return {
    nodes,
    hops,
    sources: findSources(nodes, hops),
    signature: parts.join('|'),
  }
}
