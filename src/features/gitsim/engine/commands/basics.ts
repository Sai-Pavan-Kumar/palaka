import { parseArgs } from '../parseCommand'
import {
  addCommit,
  currentBranch,
  fail,
  headCommitId,
  headTree,
  moveHeadRef,
  ok,
  shortId,
  treesEqual,
} from '../repo'
import type { CommandResult, GitState, Tree } from '../types'

export function init(state: GitState): CommandResult {
  if (state.initialized) {
    return ok(state, 'Reinitialized existing Git repository in .git/')
  }
  return ok(
    { ...state, initialized: true, head: { branch: 'main' } },
    'Initialized empty Git repository in .git/',
  )
}

// Staging a conflicted file is how git learns it was fixed.
function markResolved(state: GitState, paths: string[]): GitState {
  if (!state.op) return state
  const conflicts = state.op.conflicts.filter((path) => !paths.includes(path))
  return { ...state, op: { ...state.op, conflicts } }
}

export function add(state: GitState, args: string[]): CommandResult {
  const { positional, flags } = parseArgs(args, [])
  const all = flags.has('-A') || flags.has('--all') || positional.includes('.')
  const paths = all
    ? [...new Set([...Object.keys(state.work), ...Object.keys(state.index)])]
    : positional
  if (paths.length === 0) {
    return fail(state, 'Nothing specified, nothing added.')
  }
  const index = { ...state.index }
  for (const path of paths) {
    if (path in state.work) index[path] = state.work[path]
    else if (path in index) delete index[path]
    else return fail(state, `fatal: pathspec '${path}' did not match any files`)
  }
  return ok(markResolved({ ...state, index }, paths))
}

// `-a` stages changes to tracked files only, as real git does: a brand new
// file still needs `git add` first, which is a classic beginner surprise.
function stageTracked(state: GitState): Tree {
  const index = { ...state.index }
  for (const path of Object.keys(index)) {
    if (path in state.work) index[path] = state.work[path]
    else delete index[path]
  }
  return index
}

function amend(state: GitState, message: string | undefined, index: Tree) {
  const head = headCommitId(state)
  if (!head) return fail(state, 'fatal: You have nothing to amend.')
  const old = state.commits[head]
  const made = addCommit(state, {
    message: message ?? old.message,
    parents: old.parents,
    tree: index,
    lane: old.lane,
  })
  const next = moveHeadRef({ ...made.state, index }, made.id)
  const where = currentBranch(state) ?? 'detached HEAD'
  return ok(next, `[${where} ${shortId(made.id)}] ${message ?? old.message}`)
}

function opBlocksCommit(state: GitState): CommandResult | null {
  const { op } = state
  if (!op) return null
  if (op.conflicts.length > 0) {
    return fail(
      state,
      'error: Committing is not possible because you have unmerged files.',
      'hint: Fix them, then git add each file.',
    )
  }
  if (op.kind !== 'merge') {
    return fail(state, `error: use 'git ${op.kind} --continue' to go on`)
  }
  return null
}

export function commit(state: GitState, args: string[]): CommandResult {
  const { flags, values } = parseArgs(args, ['-m'])
  const blocked = opBlocksCommit(state)
  if (blocked) return blocked
  const index = flags.has('-a') ? stageTracked(state) : state.index
  if (flags.has('--amend')) return amend(state, values['-m'], index)
  const merging = state.op?.kind === 'merge' ? state.op : null
  const message = values['-m'] ?? merging?.message
  if (!message) {
    return fail(state, 'error: give a message with -m (Palaka has no editor)')
  }
  if (!merging && treesEqual(index, headTree(state))) {
    return fail(state, 'nothing to commit, working tree clean')
  }
  const parent = headCommitId(state)
  const branch = currentBranch(state)
  const made = addCommit(state, {
    message,
    parents: [parent, merging?.theirs].filter((id): id is string => !!id),
    tree: index,
    lane: branch ?? 'HEAD',
  })
  const next = moveHeadRef({ ...made.state, index, op: null }, made.id)
  const where = branch ?? 'detached HEAD'
  const root = parent ? '' : ' (root-commit)'
  return ok(next, `[${where}${root} ${shortId(made.id)}] ${message}`)
}
