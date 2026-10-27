import type { ListNodeValue, TraceStep } from '../run/traceTypes'
import { currentFrame, formatValue } from './traceFormat'

// Names that point at list nodes in interview code. Only these get a label
// while they are None ("prev = None" matters; "result = None" is noise).
const LIST_POINTER =
  /^(prev|curr|cur|nxt|next_node|nxt_node|head|tail|node|slow|fast|dummy|temp|tmp|p|q|first|second|l1|l2)$/

export type ListNodeBox = { id: number; text: string }
// to: a node id, or null for "points at None".
export type ListLink = { from: number; to: number | null }
export type ListLabel = { name: string; id: number | null }
export type LinkedModel = {
  nodes: ListNodeBox[]
  links: ListLink[]
  labels: ListLabel[]
}

function chainLinks(chain: ListNodeValue): ListLink[] {
  const links: ListLink[] = chain.ids.slice(1).map((to, i) => ({
    from: chain.ids[i],
    to,
  }))
  // The end of a chain is only "None" when we saw all of it.
  const last = chain.ids.at(-1)
  if (last !== undefined && !chain.cycle && !chain.more) {
    links.push({ from: last, to: null })
  }
  return links
}

// Every variable sees part of one shared web of nodes; merging them by id
// draws each node once, with every arrow anyone can see.
export function buildLinked(step: TraceStep): LinkedModel | null {
  const frame = currentFrame(step)
  if (!frame) return null
  const texts = new Map<number, string>()
  const next = new Map<number, number | null>()
  const labels: ListLabel[] = []
  for (const [name, value] of Object.entries(frame.vars)) {
    if (value.t === 'none' && LIST_POINTER.test(name)) {
      labels.push({ name, id: null })
      continue
    }
    if (value.t !== 'listnode') continue
    value.ids.forEach((id, i) => texts.set(id, formatValue(value.items[i])))
    chainLinks(value).forEach((link) => next.set(link.from, link.to))
    labels.push({ name, id: value.ids[0] ?? null })
  }
  if (texts.size === 0) return null
  const nodes = [...texts]
    .sort(([a], [b]) => a - b)
    .map(([id, text]) => ({ id, text }))
  const links = [...next].map(([from, to]) => ({ from, to }))
  return { nodes, links, labels }
}

// Labels on the same node stack upwards, like array pointers stack down.
export function labelRows(labels: ListLabel[]): Map<string, number> {
  const used = new Map<number | null, number>()
  const rows = new Map<string, number>()
  for (const label of labels) {
    const row = used.get(label.id) ?? 0
    used.set(label.id, row + 1)
    rows.set(label.name, row)
  }
  return rows
}
