import type { PyValue, TraceFrame, TraceStep } from '../run/traceTypes'
import { currentFrame, formatValue } from './traceFormat'

// Conventional names in BFS/DFS code. The graph itself is found by shape
// (a dict of neighbour lists); its colouring comes from these names.
const VISITED = ['visited', 'seen', 'vis', 'explored']
const QUEUE = ['queue', 'q', 'frontier', 'dq', 'stack']
const CURRENT = ['node', 'cur', 'curr', 'u', 'vertex']
const NEIGHBOUR = ['nxt', 'nei', 'neighbor', 'neighbour', 'v', 'child']

export type NodeState = 'current' | 'queued' | 'visited' | 'new'
export type GraphNode = { key: string; state: NodeState }
export type GraphEdge = {
  a: string
  b: string
  directed: boolean
  active: boolean
}
export type GraphModel = {
  name: string
  nodes: GraphNode[]
  edges: GraphEdge[]
}

const SCALARS = new Set(['num', 'str', 'bool'])

function neighbourTexts(value: PyValue): string[] | null {
  if (!('items' in value) || value.t === 'listnode') return null
  return value.items.every((item) => SCALARS.has(item.t))
    ? value.items.map(formatValue)
    : null
}

function adjacency(value: PyValue): Map<string, string[]> | null {
  if (value.t !== 'dict' || value.n === 0) return null
  const adj = new Map<string, string[]>()
  for (const [key, list] of value.entries) {
    const near = neighbourTexts(list)
    if (!SCALARS.has(key.t) || !near) return null
    adj.set(formatValue(key), near)
  }
  return adj
}

function itemsOf(frame: TraceFrame, names: string[]): Set<string> {
  const value = names.map((name) => frame.vars[name]).find(Boolean)
  return new Set(value ? (neighbourTexts(value) ?? []) : [])
}

function scalarOf(frame: TraceFrame, names: string[]): string | null {
  const value = names.map((name) => frame.vars[name]).find(Boolean)
  return value && SCALARS.has(value.t) ? formatValue(value) : null
}

function edgesOf(adj: Map<string, string[]>, active: [string, string] | null) {
  const edges: GraphEdge[] = []
  const done = new Set<string>()
  for (const [a, near] of adj) {
    for (const b of near) {
      if (done.has(`${b}|${a}`)) continue
      done.add(`${a}|${b}`)
      const isActive =
        !!active &&
        ((active[0] === a && active[1] === b) ||
          (active[0] === b && active[1] === a))
      const directed = !(adj.get(b) ?? []).includes(a)
      edges.push({ a, b, directed, active: isActive })
    }
  }
  return edges
}

function stateOf(
  key: string,
  current: string | null,
  queued: Set<string>,
  visited: Set<string>,
): NodeState {
  if (key === current) return 'current'
  if (queued.has(key)) return 'queued'
  return visited.has(key) ? 'visited' : 'new'
}

export function buildGraph(step: TraceStep): GraphModel | null {
  const frame = currentFrame(step)
  if (!frame) return null
  const found = Object.entries(frame.vars)
    .map(([name, value]) => [name, adjacency(value)] as const)
    .find(([, adj]) => adj)
  if (!found) return null
  const [name, adj] = found as [string, Map<string, string[]>]
  const current = scalarOf(frame, CURRENT)
  const neighbour = scalarOf(frame, NEIGHBOUR)
  const keys = [...new Set([...adj.keys(), ...[...adj.values()].flat()])]
  const queued = itemsOf(frame, QUEUE)
  const visited = itemsOf(frame, VISITED)
  return {
    name,
    nodes: keys.map((key) => ({
      key,
      state: stateOf(key, current, queued, visited),
    })),
    edges: edgesOf(adj, current && neighbour ? [current, neighbour] : null),
  }
}

function levelsFrom(model: GraphModel): string[][] {
  const near = new Map<string, string[]>(model.nodes.map((n) => [n.key, []]))
  for (const edge of model.edges) {
    near.get(edge.a)!.push(edge.b)
    if (!edge.directed) near.get(edge.b)!.push(edge.a)
  }
  const level = new Map<string, number>([[model.nodes[0].key, 0]])
  const queue = [model.nodes[0].key]
  while (queue.length > 0) {
    const key = queue.shift()!
    for (const next of near.get(key)!) {
      if (level.has(next)) continue
      level.set(next, level.get(key)! + 1)
      queue.push(next)
    }
  }
  const depth = Math.max(...level.values()) + 1
  const rows: string[][] = Array.from({ length: depth + 1 }, () => [])
  model.nodes.forEach((n) => rows[level.get(n.key) ?? depth].push(n.key))
  return rows.filter((row) => row.length > 0)
}

// Rows by distance from the first node: BFS then visibly sweeps the graph
// one row at a time, which is exactly the idea being taught. The layout
// depends only on the edges, so nodes never move during a run.
export function layeredLayout(
  model: GraphModel,
  pitchX: number,
  pitchY: number,
) {
  const rows = levelsFrom(model)
  const widest = Math.max(...rows.map((row) => row.length))
  const spots = new Map<string, { x: number; y: number }>()
  rows.forEach((row, r) =>
    row.forEach((key, i) =>
      spots.set(key, {
        x: (i + (widest - row.length) / 2) * pitchX,
        y: r * pitchY,
      }),
    ),
  )
  return {
    spots,
    width: (widest - 1) * pitchX,
    height: (rows.length - 1) * pitchY,
  }
}

export type GraphGeometry = {
  r: number
  labelH: number
  legendH: number
  layout: ReturnType<typeof layeredLayout>
}

export function graphGeometry(
  model: GraphModel,
  cell: number,
  fontPx: number,
): GraphGeometry {
  const r = cell * 0.45
  return {
    r,
    labelH: Math.round(fontPx * 1.9),
    legendH: Math.round(fontPx * 2.2),
    layout: layeredLayout(model, cell * 1.8, cell * 1.6),
  }
}

export function graphHeight(g: GraphGeometry): number {
  return g.labelH + g.layout.height + g.r * 2 + g.legendH
}
