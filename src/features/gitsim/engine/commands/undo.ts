import { parseArgs } from '../parseCommand'
import {
  addCommit,
  currentBranch,
  DIRTY_TREE,
  fail,
  hasLocalChanges,
  headCommitId,
  headTree,
  moveHeadRef,
  ok,
  resolveRef,
  shortId,
} from '../repo'
import { threeWayMerge, workFor } from '../trees'
import type { CommandResult, GitState, Tree } from '../types'

function unstage(state: GitState, paths: string[]): CommandResult {
  const index = { ...state.index }
  const head = headTree(state)
  for (const path of paths) {
    if (path in head) index[path] = head[path]
    else delete index[path]
  }
  return ok({ ...state, index })
}

// soft: only the branch moves. mixed: the staging area follows too.
// hard: the files follow as well, and uncommitted work is gone.
export function reset(state: GitState, args: string[]): CommandResult {
  const { flags, positional } = parseArgs(args, [])
  const ref = positional[0] ?? 'HEAD'
  const target = resolveRef(state, ref)
  if (!target) {
    const known = positional.every((p) => p in state.index || p in state.work)
    if (positional.length > 0 && known) return unstage(state, positional)
    return fail(state, `fatal: ambiguous argument '${ref}'`)
  }
  const moved = { ...moveHeadRef(state, target), op: null }
  const tree = state.commits[target].tree
  if (flags.has('--soft')) return ok(moved)
  if (flags.has('--hard')) {
    const work = workFor(tree, state.work, state.index)
    return ok(
      { ...moved, work, index: { ...tree } },
      `HEAD is now at ${shortId(target)} ${state.commits[target].message}`,
    )
  }
  const next = { ...moved, index: { ...tree } }
  const changed = Object.keys(next.work).filter(
    (path) => path in tree && next.work[path] !== tree[path],
  )
  return ok(
    next,
    ...(changed.length > 0 ? ['Unstaged changes after reset:'] : []),
    ...changed.map((path) => `M\t${path}`),
  )
}

export function revert(state: GitState, args: string[]): CommandResult {
  const id = args[0] ? resolveRef(state, args[0]) : null
  if (!id) return fail(state, `fatal: bad revision '${args[0] ?? ''}'`)
  if (hasLocalChanges(state)) return fail(state, DIRTY_TREE)
  const commit = state.commits[id]
  const parent = commit.parents[0]
  // Undo = apply the commit's change backwards on top of today's files.
  const merged = threeWayMerge(
    commit.tree,
    headTree(state),
    parent ? state.commits[parent].tree : {},
    'revert',
  )
  if (merged.conflicts.length > 0) {
    return fail(state, "Palaka's Git cannot show a revert conflict yet.")
  }
  const message = `Revert "${commit.message}"`
  const made = addCommit(state, {
    message,
    parents: [headCommitId(state)!],
    tree: merged.tree,
    lane: currentBranch(state) ?? 'HEAD',
  })
  const work = workFor(merged.tree, state.work, state.index)
  const next = moveHeadRef({ ...made.state, work, index: merged.tree }, made.id)
  const where = currentBranch(state) ?? 'detached HEAD'
  return ok(next, `[${where} ${shortId(made.id)}] ${message}`)
}

export function restore(state: GitState, args: string[]): CommandResult {
  const { flags, positional } = parseArgs(args, [])
  if (positional.length === 0)
    return fail(state, 'fatal: you must specify path(s)')
  if (flags.has('--staged')) return unstage(state, positional)
  const work = { ...state.work }
  for (const path of positional) {
    if (!(path in state.index)) {
      return fail(
        state,
        `error: pathspec '${path}' did not match any file(s) known to git`,
      )
    }
    work[path] = state.index[path]
  }
  return ok({ ...state, work })
}

function trackedWork(state: GitState): Tree {
  const tracked = { ...headTree(state), ...state.index }
  return Object.fromEntries(
    Object.entries(state.work).filter(([p]) => p in tracked),
  )
}

function stashPush(state: GitState): CommandResult {
  if (!hasLocalChanges(state)) return ok(state, 'No local changes to save')
  const head = headCommitId(state)
  const base = headTree(state)
  const label = `WIP on ${currentBranch(state) ?? 'HEAD'}: ${head ? shortId(head) : ''}`
  const entry = {
    base,
    work: trackedWork(state),
    index: { ...state.index },
    label,
  }
  const work = workFor(base, state.work, { ...base, ...state.index })
  return ok(
    { ...state, stash: [entry, ...state.stash], work, index: { ...base } },
    `Saved working directory and index state ${label}`,
  )
}

function stashApply(state: GitState, drop: boolean): CommandResult {
  const [entry, ...rest] = state.stash
  if (!entry) return fail(state, 'error: No stash entries found.')
  const merged = threeWayMerge(entry.base, headTree(state), entry.work, 'stash')
  if (merged.conflicts.length > 0) {
    return fail(state, "Palaka's Git cannot show a stash conflict yet.")
  }
  const untracked = Object.fromEntries(
    Object.entries(state.work).filter(([p]) => !(p in state.index)),
  )
  const index = { ...state.index }
  // Brand new files come back staged, like real git; edits come back unstaged.
  for (const [path, text] of Object.entries(entry.index)) {
    if (!(path in entry.base)) index[path] = text
  }
  const next = { ...state, work: { ...untracked, ...merged.tree }, index }
  if (!drop) return ok(next)
  return ok({ ...next, stash: rest }, 'Dropped refs/stash@{0}')
}

export function stash(state: GitState, args: string[]): CommandResult {
  const [sub = 'push'] = args
  if (sub === 'push' || sub === 'save') return stashPush(state)
  if (sub === 'pop') return stashApply(state, true)
  if (sub === 'apply') return stashApply(state, false)
  if (sub === 'list') {
    return ok(state, ...state.stash.map((e, i) => `stash@{${i}}: ${e.label}`))
  }
  if (sub === 'drop') {
    if (state.stash.length === 0)
      return fail(state, 'error: No stash entries found.')
    return ok(
      { ...state, stash: state.stash.slice(1) },
      'Dropped refs/stash@{0}',
    )
  }
  return fail(state, `Palaka's Git does not know 'git stash ${sub}' yet`)
}
