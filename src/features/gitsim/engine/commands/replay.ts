import { parseArgs } from '../parseCommand'
import {
  addCommit,
  ancestors,
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
  snapshot,
} from '../repo'
import { threeWayMerge, workFor, type MergedTree } from '../trees'
import type { CommandResult, GitState, Saved } from '../types'
import { abortOp, jumpTo } from './merge'

type Replayed = { state: GitState; conflict: MergedTree | null }

// Copies one commit's change (its diff from its parent) onto HEAD as a new
// commit. The copy gets a new id: that is why rebased commits are "new".
function replayOne(state: GitState, id: string, lane: string): Replayed {
  const commit = state.commits[id]
  const parent = commit.parents[0]
  const merged = threeWayMerge(
    parent ? state.commits[parent].tree : {},
    headTree(state),
    commit.tree,
    `${shortId(id)} (${commit.message})`,
  )
  if (merged.conflicts.length > 0) {
    const index = { ...merged.tree }
    const ours = headTree(state)
    for (const path of merged.conflicts) {
      if (path in ours) index[path] = ours[path]
      else delete index[path]
    }
    const work = workFor(merged.tree, state.work, state.index)
    return { state: { ...state, work, index }, conflict: merged }
  }
  const made = addCommit(state, {
    message: commit.message,
    parents: [headCommitId(state)!],
    tree: merged.tree,
    lane,
  })
  const work = workFor(merged.tree, state.work, state.index)
  const next = moveHeadRef({ ...made.state, work, index: merged.tree }, made.id)
  return { state: next, conflict: null }
}

function conflictLines(id: string, state: GitState, paths: string[]) {
  return [
    ...paths.map((p) => `CONFLICT (content): Merge conflict in ${p}`),
    `error: could not apply ${shortId(id)}... ${state.commits[id].message}`,
  ]
}

type RebaseMeta = { branch: string | null; upstream: string; before: Saved }

function runTodo(state: GitState, todo: string[], meta: RebaseMeta) {
  let current = state
  for (let i = 0; i < todo.length; i += 1) {
    const id = todo[i]
    const done = replayOne(current, id, current.commits[id].lane)
    if (done.conflict) {
      const op = {
        kind: 'rebase' as const,
        current: id,
        todo: todo.slice(i + 1),
        conflicts: done.conflict.conflicts,
        ...meta,
      }
      return fail(
        { ...done.state, op },
        ...conflictLines(id, current, op.conflicts),
        "hint: fix the files, git add them, then 'git rebase --continue'",
      )
    }
    current = done.state
  }
  const tip = headCommitId(current)!
  if (!meta.branch) return ok({ ...current, op: null }, 'Successfully rebased.')
  const finished: GitState = {
    ...current,
    op: null,
    head: { branch: meta.branch },
    branches: { ...current.branches, [meta.branch]: tip },
  }
  return ok(
    finished,
    `Successfully rebased and updated refs/heads/${meta.branch}.`,
  )
}

// Finishes the stopped commit with the fixed files, keeping its message.
function commitResolved(state: GitState, id: string, lane: string) {
  const made = addCommit(state, {
    message: state.commits[id].message,
    parents: [headCommitId(state)!],
    tree: state.index,
    lane,
  })
  return moveHeadRef(made.state, made.id)
}

function continueRebase(state: GitState): CommandResult {
  const { op } = state
  if (op?.kind !== 'rebase') return fail(state, 'fatal: No rebase in progress?')
  if (op.conflicts.length > 0) {
    return fail(state, 'error: fix and git add the conflicted files first')
  }
  const next = commitResolved(state, op.current, state.commits[op.current].lane)
  const { branch, upstream, before } = op
  return runTodo(next, op.todo, { branch, upstream, before })
}

function startRebase(state: GitState, ref: string): CommandResult {
  const upstream = resolveRef(state, ref)
  if (!upstream) return fail(state, `fatal: invalid upstream '${ref}'`)
  const head = headCommitId(state)
  if (!head) return fail(state, 'fatal: no commits yet')
  if (state.op) return fail(state, `error: a ${state.op.kind} is in progress`)
  if (hasLocalChanges(state)) return fail(state, DIRTY_TREE)
  const branch = currentBranch(state)
  const onUpstream = ancestors(state, upstream)
  if (onUpstream.has(head)) {
    if (head === upstream)
      return ok(state, `Current branch ${branch} is up to date.`)
    return ok(
      jumpTo(state, upstream),
      `Successfully rebased and updated refs/heads/${branch}.`,
    )
  }
  const mine = ancestors(state, head)
  const todo = state.order.filter(
    (id) =>
      mine.has(id) &&
      !onUpstream.has(id) &&
      state.commits[id].parents.length < 2,
  )
  const before = snapshot(state)
  const detached = jumpTo({ ...state, head: { detached: head } }, upstream)
  return runTodo(detached, todo, { branch, upstream, before })
}

export function rebase(state: GitState, args: string[]): CommandResult {
  const { flags, positional } = parseArgs(args, [])
  if (flags.has('--continue')) return continueRebase(state)
  if (flags.has('--abort')) return abortOp(state, 'rebase')
  if (flags.has('-i') || flags.has('--interactive')) {
    return fail(
      state,
      "Palaka's Git has no editor for 'rebase -i'.",
      'To squash: git reset --soft HEAD~3, then git commit -m "one message"',
    )
  }
  if (!positional[0])
    return fail(state, 'fatal: tell rebase which branch to rebase onto')
  return startRebase(state, positional[0])
}

export function cherryPick(state: GitState, args: string[]): CommandResult {
  const { flags, positional } = parseArgs(args, [])
  const lane = currentBranch(state) ?? 'HEAD'
  if (flags.has('--abort')) return abortOp(state, 'cherry-pick')
  if (flags.has('--continue')) {
    const { op } = state
    if (op?.kind !== 'cherry-pick')
      return fail(state, 'error: no cherry-pick in progress')
    if (op.conflicts.length > 0)
      return fail(state, 'error: fix and git add the files first')
    return ok({ ...commitResolved(state, op.current, lane), op: null })
  }
  const id = positional[0] ? resolveRef(state, positional[0]) : null
  if (!id) return fail(state, `fatal: bad revision '${positional[0] ?? ''}'`)
  if (!headCommitId(state)) return fail(state, 'fatal: no commits yet')
  if (hasLocalChanges(state)) return fail(state, DIRTY_TREE)
  const done = replayOne(state, id, lane)
  if (!done.conflict) {
    const tip = headCommitId(done.state)!
    return ok(
      done.state,
      `[${lane} ${shortId(tip)}] ${state.commits[id].message}`,
    )
  }
  const op = {
    kind: 'cherry-pick' as const,
    current: id,
    conflicts: done.conflict.conflicts,
    before: snapshot(state),
  }
  return fail(
    { ...done.state, op },
    ...conflictLines(id, state, op.conflicts),
    "hint: fix the files, git add them, then 'git cherry-pick --continue'",
  )
}
