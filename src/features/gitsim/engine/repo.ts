import type { CommandResult, GitState, Saved, Tree } from './types'

export const NOT_A_REPO =
  'fatal: not a git repository (or any of the parent directories): .git'

export function ok(state: GitState, ...output: string[]): CommandResult {
  return { state, output, error: false }
}

export function fail(state: GitState, ...output: string[]): CommandResult {
  return { state, output, error: true }
}

export function shortId(id: string): string {
  return id.slice(0, 7)
}

// FNV-1a: a stable fake hash, so the same script always draws the same ids
// and a re-recorded take matches the first one.
function makeCommitId(state: GitState, message: string, parent: string) {
  const seed = `${state.order.length}\u0000${message}\u0000${parent}`
  let a = 0x811c9dc5
  let b = 0x01000193
  for (let i = 0; i < seed.length; i += 1) {
    a = Math.imul(a ^ seed.charCodeAt(i), 0x01000193)
    b = Math.imul(b ^ seed.charCodeAt(i), 0x811c9dc5)
  }
  const hex = (n: number) => (n >>> 0).toString(16).padStart(8, '0')
  return `${hex(a)}${hex(b)}`.slice(0, 12)
}

type NewCommit = {
  message: string
  parents: string[]
  tree: Tree
  lane: string
  // Teammate commits exist only on GitHub until fetched.
  onLaptop?: boolean
}

export function addCommit(state: GitState, spec: NewCommit) {
  const id = makeCommitId(state, spec.message, spec.parents.join(','))
  const { onLaptop = true, ...commit } = spec
  const next: GitState = {
    ...state,
    commits: {
      ...state.commits,
      [id]: { id, ...commit, tree: { ...spec.tree } },
    },
    order: [...state.order, id],
    local: onLaptop ? { ...state.local, [id]: true } : state.local,
  }
  return { state: next, id }
}

export function headCommitId(state: GitState): string | null {
  if ('detached' in state.head) return state.head.detached
  return state.branches[state.head.branch] ?? null
}

export function headTree(state: GitState): Tree {
  const id = headCommitId(state)
  return id ? state.commits[id].tree : {}
}

export function currentBranch(state: GitState): string | null {
  return 'branch' in state.head ? state.head.branch : null
}

// Points HEAD's branch (or HEAD itself when detached) at another commit.
export function moveHeadRef(state: GitState, id: string): GitState {
  const branch = currentBranch(state)
  if (branch) return { ...state, branches: { ...state.branches, [branch]: id } }
  return { ...state, head: { detached: id } }
}

function findCommitByPrefix(state: GitState, prefix: string): string | null {
  if (prefix.length < 4) return null
  const hits = state.order.filter(
    (id) => id.startsWith(prefix) && state.local[id],
  )
  return hits.length === 1 ? hits[0] : null
}

function resolveBase(state: GitState, name: string): string | null {
  if (name === 'HEAD' || name === '@') return headCommitId(state)
  if (name.startsWith('origin/')) {
    return state.tracking[name.slice('origin/'.length)] ?? null
  }
  return (
    state.branches[name] ?? state.tags[name] ?? findCommitByPrefix(state, name)
  )
}

// Branch, tag, origin/<branch>, commit id prefix or HEAD, followed by any
// mix of ~n and ^ (first parent only, which is all a lesson needs).
export function resolveRef(state: GitState, ref: string): string | null {
  const match = /^([^~^]+)((?:[~^]\d*)*)$/.exec(ref)
  if (!match) return null
  let id = resolveBase(state, match[1])
  for (const hop of match[2].match(/[~^]\d*/g) ?? []) {
    const count = hop.length > 1 ? Number(hop.slice(1)) : 1
    const steps = hop[0] === '^' ? Math.min(count, 1) : count
    for (let i = 0; i < steps && id; i += 1) {
      id = state.commits[id].parents[0] ?? null
    }
  }
  return id
}

// Every commit reachable from `from` by following parents.
export function ancestors(state: GitState, from: string): Set<string> {
  const seen = new Set<string>()
  const stack = [from]
  while (stack.length > 0) {
    const id = stack.pop()!
    if (seen.has(id)) continue
    seen.add(id)
    stack.push(...state.commits[id].parents)
  }
  return seen
}

// The newest commit both sides share: the "base" of a three-way merge.
export function mergeBase(state: GitState, a: string, b: string) {
  const fromA = ancestors(state, a)
  const shared = [...ancestors(state, b)].filter((id) => fromA.has(id))
  shared.sort((x, y) => state.order.indexOf(y) - state.order.indexOf(x))
  return shared[0] ?? null
}

export function treesEqual(a: Tree, b: Tree): boolean {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)])
  for (const key of keys) if (a[key] !== b[key]) return false
  return true
}

// Staged or unstaged changes to tracked files. Untracked files never count,
// the same as in real git.
export function hasLocalChanges(state: GitState): boolean {
  if (!treesEqual(state.index, headTree(state))) return true
  return Object.keys(state.index).some(
    (path) => state.work[path] !== state.index[path],
  )
}

export function untrackedFiles(state: GitState): Tree {
  return Object.fromEntries(
    Object.entries(state.work).filter(
      ([path]) => !(path in state.index) && !(path in headTree(state)),
    ),
  )
}

export function snapshot(state: GitState): Saved {
  const { head, branches, work, index } = state
  return { head, branches, work, index }
}

export const DIRTY_TREE =
  'error: Your local changes would be overwritten. Commit or stash them first.'
