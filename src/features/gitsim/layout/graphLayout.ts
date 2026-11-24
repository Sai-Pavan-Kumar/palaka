import { ancestors, currentBranch } from '../engine/repo'
import type { GitState } from '../engine/types'

export type LaneSpot = {
  key: string
  name: string
  // What the row is called on screen: a detached row takes the name of
  // the branch later made from it.
  title: string
  index: number
  y: number
}

export type NodeSpot = {
  key: string
  id: string
  x: number
  y: number
  laneIndex: number
  message: string
  isHead: boolean
  // Left behind by a delete or reset: drawn faint, like git's garbage.
  isOrphan: boolean
}

export type EdgeSpot = {
  key: string
  path: string
  laneIndex: number
  isOrphan: boolean
}

export type LabelKind = 'branch' | 'tag' | 'head' | 'tracking' | 'more'

export type LabelSpot = {
  key: string
  text: string
  kind: LabelKind
  x: number
  y: number
  laneIndex: number
  isCurrent: boolean
}

export type GraphLayout = {
  lanes: LaneSpot[]
  nodes: NodeSpot[]
  edges: EdgeSpot[]
  labels: LabelSpot[]
  // Room per commit column; messages are cut to fit it.
  stepX: number
}

export type GraphArea = {
  left: number
  right: number
  top: number
  bottom: number
}

// What one band shows: the laptop and GitHub draw the same commits at the
// same x, so a commit "travelling" on push is visible as a column filling in.
export type Band = {
  prefix: string
  ids: string[]
  branches: Record<string, string>
  tags: Record<string, string>
  tracking: Record<string, string>
  head: string | null
  current: string | null
}

const MAX_STEP_X = 190
const MAX_LANE_GAP = 170
const LABEL_RISE = 62
const LABEL_STACK = 40
// Lanes never squeeze closer than one commit's id + message.
const MIN_LANE_GAP = 90
// The board area above each band is sized for two stacked labels.
const LABEL_LEVELS_ROOM = 2
const MAX_LABELS = 3

// main first, then lanes in the order they were first used, so adding a
// branch never reshuffles the rows already on screen mid-recording.
function laneOrder(state: GitState, ids: string[]): string[] {
  const seen = new Set<string>()
  if (ids.some((id) => state.commits[id].lane === 'main')) seen.add('main')
  for (const id of ids) seen.add(state.commits[id].lane)
  return [...seen]
}

function reachable(state: GitState, tips: (string | null)[]): Set<string> {
  const all = new Set<string>()
  for (const tip of tips) {
    if (tip) for (const id of ancestors(state, tip)) all.add(id)
  }
  return all
}

export function localBand(state: GitState): Band {
  const head =
    'detached' in state.head
      ? state.head.detached
      : (state.branches[state.head.branch] ?? null)
  return {
    prefix: 'l:',
    ids: state.order.filter((id) => state.local[id]),
    branches: state.branches,
    tags: state.tags,
    tracking: state.remote ? state.tracking : {},
    head,
    current: currentBranch(state),
  }
}

export function remoteBand(state: GitState): Band | null {
  if (!state.remote) return null
  const live = reachable(state, Object.values(state.remote.branches))
  return {
    prefix: 'r:',
    ids: state.order.filter((id) => live.has(id)),
    branches: state.remote.branches,
    tags: {},
    tracking: {},
    head: null,
    current: null,
  }
}

function edgePath(from: NodeSpot, to: NodeSpot): string {
  if (from.y === to.y) return `M ${from.x} ${from.y} L ${to.x} ${to.y}`
  // Leave the parent's lane early and arrive level, like a road junction.
  const bend = Math.min((to.x - from.x) * 0.6, MAX_STEP_X)
  return `M ${from.x} ${from.y} C ${from.x + bend} ${from.y} ${to.x - bend} ${to.y} ${to.x} ${to.y}`
}

type RefEntry = { name: string; kind: LabelKind; text: string }

// Labels per commit, bottom to top. Past MAX_LABELS the least important
// ones fold into one "+N more" pill, so a busy commit never climbs off
// the board: HEAD and the current branch always stay visible.
function entriesByCommit(band: Band): Map<string, RefEntry[]> {
  const byCommit = new Map<string, RefEntry[]>()
  const add = (at: string, entry: RefEntry) =>
    byCommit.set(at, [...(byCommit.get(at) ?? []), entry])
  for (const [name, at] of Object.entries(band.tags)) {
    add(at, { name, kind: 'tag', text: name })
  }
  for (const [name, at] of Object.entries(band.branches)) {
    add(at, { name, kind: 'branch', text: name })
  }
  for (const [name, at] of Object.entries(band.tracking)) {
    add(at, { name, kind: 'tracking', text: `origin/${name}` })
  }
  if (band.head) add(band.head, { name: 'HEAD', kind: 'head', text: 'HEAD' })
  for (const [at, entries] of byCommit) {
    byCommit.set(at, foldExtra(entries, band.current))
  }
  return byCommit
}

function foldExtra(entries: RefEntry[], current: string | null): RefEntry[] {
  if (entries.length <= MAX_LABELS) return entries
  const isKept = (e: RefEntry) =>
    e.kind === 'head' || (e.kind === 'branch' && e.name === current)
  const kept = entries.filter(isKept)
  const rest = entries.filter((e) => !isKept(e))
  const room = MAX_LABELS - 1 - kept.length
  const shown = rest.slice(0, room)
  const hidden = rest.length - shown.length
  const more: RefEntry = { name: 'more', kind: 'more', text: `+${hidden} more` }
  const head = kept.filter((e) => e.kind === 'head')
  const branch = kept.filter((e) => e.kind !== 'head')
  return [...shown, ...branch, more, ...head]
}

function refLabels(band: Band, nodes: Map<string, NodeSpot>): LabelSpot[] {
  const labels: LabelSpot[] = []
  for (const [at, entries] of entriesByCommit(band)) {
    const node = nodes.get(at)
    if (!node) continue
    entries.forEach(({ name, kind, text }, level) => {
      labels.push({
        // Keyed by name, not by commit, so a label slides when it moves.
        key:
          kind === 'more'
            ? `${band.prefix}more:${at}`
            : `${band.prefix}${kind}:${name}`,
        text,
        kind,
        x: node.x,
        y: node.y - LABEL_RISE - level * LABEL_STACK,
        laneIndex: node.laneIndex,
        isCurrent:
          kind === 'head' || (kind === 'branch' && name === band.current),
      })
    })
  }
  return labels
}

function detachedTitle(state: GitState, band: Band): string {
  const adopted = Object.entries(band.branches).find(
    ([, tip]) => state.commits[tip]?.lane === 'HEAD',
  )
  return adopted ? adopted[0] : 'detached'
}

function placeLanes(
  state: GitState,
  names: string[],
  band: Band,
  area: GraphArea,
): LaneSpot[] {
  const gap =
    names.length > 1
      ? Math.max(
          MIN_LANE_GAP,
          Math.min(MAX_LANE_GAP, (area.bottom - area.top) / (names.length - 1)),
        )
      : 0
  return names.map((name, index) => ({
    key: band.prefix + name,
    name,
    title: name === 'HEAD' ? detachedTitle(state, band) : name,
    index,
    y: area.top + index * gap,
  }))
}

function buildEdges(
  state: GitState,
  nodes: Map<string, NodeSpot>,
  prefix: string,
) {
  const edges: EdgeSpot[] = []
  for (const node of nodes.values()) {
    for (const parent of state.commits[node.id].parents) {
      const from = nodes.get(parent)
      if (!from) continue
      edges.push({
        key: `${prefix}${parent}>${node.id}`,
        path: edgePath(from, node),
        laneIndex: node.laneIndex,
        isOrphan: node.isOrphan,
      })
    }
  }
  return edges
}

// x comes from the commit's place in the whole history, never from the
// band, so a commit sits in the same column on the laptop and on GitHub.
// A commit carrying many labels (tag, branches, origin/, HEAD) would stack
// them off the top of the board, so the whole band moves down instead.
function labelShift(band: Band): number {
  const counts = new Map<string, number>()
  const tips = [
    ...Object.values(band.tags),
    ...Object.values(band.branches),
    ...Object.values(band.tracking),
    ...(band.head ? [band.head] : []),
  ]
  for (const id of tips) counts.set(id, (counts.get(id) ?? 0) + 1)
  const tallest = Math.min(MAX_LABELS, Math.max(0, ...counts.values()))
  return Math.max(0, tallest - LABEL_LEVELS_ROOM) * LABEL_STACK
}

export function layoutGraph(
  state: GitState,
  area: GraphArea,
  band: Band = localBand(state),
): GraphLayout {
  const shift = labelShift(band)
  area = {
    ...area,
    top: area.top + shift,
    bottom: Math.max(area.bottom, area.top + shift),
  }
  const laneNames = laneOrder(state, band.ids)
  const lanes = placeLanes(state, laneNames, band, area)
  const stepX = Math.min(
    MAX_STEP_X,
    (area.right - area.left) / Math.max(state.order.length - 1, 1),
  )
  const live = reachable(state, [
    ...Object.values(band.branches),
    ...Object.values(band.tags),
    ...Object.values(band.tracking),
    band.head,
  ])
  const nodes = new Map<string, NodeSpot>()
  for (const id of band.ids) {
    const commit = state.commits[id]
    const laneIndex = laneNames.indexOf(commit.lane)
    nodes.set(id, {
      key: band.prefix + id,
      id,
      x: area.left + state.order.indexOf(id) * stepX,
      y: lanes[laneIndex].y,
      laneIndex,
      message: commit.message,
      isHead: id === band.head,
      isOrphan: !live.has(id),
    })
  }
  return {
    lanes,
    nodes: [...nodes.values()],
    edges: buildEdges(state, nodes, band.prefix),
    labels: refLabels(band, nodes),
    stepX,
  }
}
