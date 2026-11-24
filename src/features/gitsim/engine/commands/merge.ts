import { parseArgs } from '../parseCommand'
import {
  addCommit,
  ancestors,
  currentBranch,
  DIRTY_TREE,
  fail,
  hasLocalChanges,
  headCommitId,
  mergeBase,
  moveHeadRef,
  ok,
  resolveRef,
  shortId,
  snapshot,
} from '../repo'
import { threeWayMerge, workFor } from '../trees'
import type { CommandResult, GitState, Tree } from '../types'

function mergeMessage(state: GitState, name: string): string {
  const kind = name.startsWith('origin/') ? 'remote-tracking branch' : 'branch'
  const into = currentBranch(state)
  const suffix = into && into !== 'main' ? ` into ${into}` : ''
  return `Merge ${kind} '${name}'${suffix}`
}

// Moves HEAD's branch to `id` and makes the files match: a clean
// fast-forward, a reset --hard, or the last step of a rebase.
export function jumpTo(state: GitState, id: string, tree?: Tree): GitState {
  const target = tree ?? state.commits[id].tree
  const moved = moveHeadRef(state, id)
  return {
    ...moved,
    work: workFor(target, state.work, state.index),
    index: { ...target },
  }
}

export function abortOp(state: GitState, kind: string): CommandResult {
  if (state.op?.kind !== kind) {
    return fail(state, `fatal: There is no ${kind} to abort.`)
  }
  return ok({ ...state, ...state.op.before, op: null })
}

function conflictResult(
  state: GitState,
  theirs: string,
  merged: { tree: Tree; conflicts: string[] },
  message: string,
): CommandResult {
  const ours = state.commits[headCommitId(state)!].tree
  const index = { ...merged.tree }
  for (const path of merged.conflicts) {
    if (path in ours) index[path] = ours[path]
    else delete index[path]
  }
  const next: GitState = {
    ...state,
    work: workFor(merged.tree, state.work, state.index),
    index,
    op: {
      kind: 'merge',
      theirs,
      message,
      conflicts: merged.conflicts,
      before: snapshot(state),
    },
  }
  return fail(
    next,
    ...merged.conflicts.map(
      (p) => `CONFLICT (content): Merge conflict in ${p}`,
    ),
    'Automatic merge failed; fix conflicts and then commit the result.',
  )
}

function threeWay(
  state: GitState,
  theirs: string,
  name: string,
  opts: { squash: boolean; message?: string },
): CommandResult {
  const head = headCommitId(state)!
  const base = mergeBase(state, head, theirs)
  const merged = threeWayMerge(
    base ? state.commits[base].tree : {},
    state.commits[head].tree,
    state.commits[theirs].tree,
    name,
  )
  const message = opts.message ?? mergeMessage(state, name)
  if (merged.conflicts.length > 0) {
    return conflictResult(state, theirs, merged, message)
  }
  const work = workFor(merged.tree, state.work, state.index)
  if (opts.squash) {
    return ok(
      { ...state, work, index: { ...merged.tree } },
      'Squash commit -- not updating HEAD',
      'Automatic merge went well; now run git commit.',
    )
  }
  const made = addCommit(state, {
    message,
    parents: [head, theirs],
    tree: merged.tree,
    lane: currentBranch(state) ?? 'HEAD',
  })
  const next = moveHeadRef({ ...made.state, work, index: merged.tree }, made.id)
  return ok(next, "Merge made by the 'ort' strategy.")
}

export function mergeInto(
  state: GitState,
  name: string,
  opts: { squash?: boolean; noFf?: boolean; message?: string } = {},
): CommandResult {
  const theirs = resolveRef(state, name)
  if (!theirs) return fail(state, `merge: ${name} - not something we can merge`)
  const head = headCommitId(state)
  if (!head) return fail(state, 'fatal: no commits yet to merge into')
  if (state.op) return fail(state, `error: a ${state.op.kind} is in progress`)
  if (hasLocalChanges(state)) return fail(state, DIRTY_TREE)
  if (ancestors(state, head).has(theirs))
    return ok(state, 'Already up to date.')
  const canFastForward = ancestors(state, theirs).has(head)
  if (canFastForward && !opts.noFf && !opts.squash) {
    return ok(
      jumpTo(state, theirs),
      `Updating ${shortId(head)}..${shortId(theirs)}`,
      'Fast-forward',
    )
  }
  return threeWay(state, theirs, name, {
    squash: !!opts.squash,
    message: opts.message,
  })
}

export function merge(state: GitState, args: string[]): CommandResult {
  const { flags, values, positional } = parseArgs(args, ['-m'])
  if (flags.has('--abort')) return abortOp(state, 'merge')
  if (!positional[0]) return fail(state, 'fatal: tell merge which branch')
  return mergeInto(state, positional[0], {
    squash: flags.has('--squash'),
    noFf: flags.has('--no-ff'),
    message: values['-m'],
  })
}
