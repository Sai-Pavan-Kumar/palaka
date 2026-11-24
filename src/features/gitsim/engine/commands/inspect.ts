import { parseArgs } from '../parseCommand'
import {
  ancestors,
  currentBranch,
  fail,
  headCommitId,
  headTree,
  ok,
  resolveRef,
  shortId,
} from '../repo'
import type { CommandResult, GitState, Tree } from '../types'

function decorations(state: GitState, id: string): string {
  const labels: string[] = []
  const branch = currentBranch(state)
  if ('detached' in state.head && state.head.detached === id) {
    labels.push('HEAD')
  }
  for (const [name, at] of Object.entries(state.branches)) {
    if (at === id) labels.push(name === branch ? `HEAD -> ${name}` : name)
  }
  for (const [name, at] of Object.entries(state.tracking)) {
    if (at === id) labels.push(`origin/${name}`)
  }
  for (const [name, at] of Object.entries(state.tags)) {
    if (at === id) labels.push(`tag: ${name}`)
  }
  labels.sort(
    (a, b) => Number(b.startsWith('HEAD')) - Number(a.startsWith('HEAD')),
  )
  return labels.length > 0 ? ` (${labels.join(', ')})` : ''
}

export function log(state: GitState, args: string[]): CommandResult {
  const { flags } = parseArgs(args, [])
  const tip = headCommitId(state)
  const tips = flags.has('--all')
    ? [
        ...Object.values(state.branches),
        ...Object.values(state.tracking),
        ...Object.values(state.tags),
        ...(tip ? [tip] : []),
      ]
    : tip
      ? [tip]
      : []
  if (tips.length === 0) {
    const branch = currentBranch(state) ?? 'HEAD'
    return fail(
      state,
      `fatal: your current branch '${branch}' does not have any commits yet`,
    )
  }
  const shown = new Set(tips.flatMap((id) => [...ancestors(state, id)]))
  const lines = state.order
    .filter((id) => shown.has(id))
    .reverse()
    .map((id) => {
      const { message } = state.commits[id]
      return `${shortId(id)}${decorations(state, id)} ${message}`
    })
  return ok(state, ...lines)
}

function diffLines(path: string, from: Tree, to: Tree): string[] {
  const before = from[path]?.split('\n') ?? []
  const after = to[path]?.split('\n') ?? []
  const removed = before.filter((line) => !after.includes(line))
  const added = after.filter((line) => !before.includes(line))
  return [
    `--- ${path}`,
    ...removed.map((line) => `- ${line}`),
    ...added.map((line) => `+ ${line}`),
  ]
}

function treeDiff(state: GitState, from: Tree, to: Tree): CommandResult {
  const paths = [...new Set([...Object.keys(from), ...Object.keys(to)])]
  const changed = paths.filter((path) => from[path] !== to[path]).sort()
  return ok(state, ...changed.flatMap((path) => diffLines(path, from, to)))
}

export function diff(state: GitState, args: string[]): CommandResult {
  const { flags, positional } = parseArgs(args, [])
  if (flags.has('--staged') || flags.has('--cached')) {
    return treeDiff(state, headTree(state), state.index)
  }
  if (positional.length === 2) {
    const [a, b] = positional.map((ref) => resolveRef(state, ref))
    if (!a || !b) return fail(state, 'fatal: bad revision')
    return treeDiff(state, state.commits[a].tree, state.commits[b].tree)
  }
  // Plain diff: what you changed but did not stage yet (tracked files only).
  const tracked = Object.fromEntries(
    Object.entries(state.work).filter(([path]) => path in state.index),
  )
  return treeDiff(state, state.index, tracked)
}

export function reflog(state: GitState): CommandResult {
  const lines = [...state.reflog]
    .reverse()
    .map(({ id, action }, i) => `${shortId(id)} HEAD@{${i}}: ${action}`)
  return ok(state, ...lines)
}

export function show(state: GitState, args: string[]): CommandResult {
  const id = resolveRef(state, args[0] ?? 'HEAD')
  if (!id) return fail(state, `fatal: bad revision '${args[0]}'`)
  const commit = state.commits[id]
  const parent = commit.parents[0]
  const before = parent ? state.commits[parent].tree : {}
  const body = treeDiff(state, before, commit.tree).output
  return ok(state, `commit ${shortId(id)}`, `    ${commit.message}`, ...body)
}
