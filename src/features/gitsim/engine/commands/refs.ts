import { parseArgs } from '../parseCommand'
import {
  ancestors,
  currentBranch,
  fail,
  headCommitId,
  ok,
  resolveRef,
  shortId,
} from '../repo'
import type { CommandResult, GitState } from '../types'
import { moveHead } from './moveHead'

const VALID_NAME = /^(?!-)(?!.*\.\.)[\w./-]+$/

function listBranches(state: GitState): CommandResult {
  const branch = currentBranch(state)
  const lines = Object.keys(state.branches)
    .sort()
    .map((name) => `${name === branch ? '*' : ' '} ${name}`)
  if (!branch) {
    lines.unshift(`* (HEAD detached at ${shortId(headCommitId(state) ?? '')})`)
  }
  return ok(state, ...lines)
}

export function createBranch(
  state: GitState,
  name: string,
  start = 'HEAD',
): CommandResult {
  if (!VALID_NAME.test(name)) {
    return fail(state, `fatal: '${name}' is not a valid branch name`)
  }
  if (name in state.branches) {
    return fail(state, `fatal: a branch named '${name}' already exists`)
  }
  const at = resolveRef(state, start)
  if (!at) {
    const shown = start === 'HEAD' ? (currentBranch(state) ?? start) : start
    return fail(state, `fatal: not a valid object name: '${shown}'`)
  }
  return ok({ ...state, branches: { ...state.branches, [name]: at } })
}

function deleteBranch(
  state: GitState,
  name: string,
  force: boolean,
): CommandResult {
  const at = state.branches[name]
  if (!at) return fail(state, `error: branch '${name}' not found`)
  if (currentBranch(state) === name) {
    return fail(
      state,
      `error: cannot delete branch '${name}': it is checked out`,
    )
  }
  const head = headCommitId(state)
  const merged = head !== null && ancestors(state, head).has(at)
  if (!force && !merged) {
    return fail(
      state,
      `error: the branch '${name}' is not fully merged`,
      `hint: use 'git branch -D ${name}' to delete it anyway`,
    )
  }
  const branches = { ...state.branches }
  delete branches[name]
  return ok(
    { ...state, branches },
    `Deleted branch ${name} (was ${shortId(at)}).`,
  )
}

export function branch(state: GitState, args: string[]): CommandResult {
  const { flags, positional } = parseArgs(args, [])
  if (flags.has('-d') || flags.has('-D')) {
    if (!positional[0]) return fail(state, 'fatal: branch name required')
    return deleteBranch(state, positional[0], flags.has('-D'))
  }
  if (flags.has('-m')) return renameBranch(state, positional)
  if (flags.has('-r')) {
    return ok(state, ...Object.keys(state.tracking).map((n) => `  origin/${n}`))
  }
  if (positional.length === 0) return listBranches(state)
  return createBranch(state, positional[0], positional[1])
}

// `git branch -m new` renames the current branch; `-m old new` any branch.
function renameBranch(state: GitState, names: string[]): CommandResult {
  const [from, to] =
    names.length === 1 ? [currentBranch(state), names[0]] : names
  if (!from || !to) return fail(state, 'fatal: branch name required')
  if (!(from in state.branches)) {
    return fail(state, `error: refname refs/heads/${from} not found`)
  }
  if (to in state.branches) {
    return fail(state, `fatal: a branch named '${to}' already exists`)
  }
  const branches = { ...state.branches, [to]: state.branches[from] }
  delete branches[from]
  const head = currentBranch(state) === from ? { branch: to } : state.head
  // The lane is the branch's history, so it takes the new name too.
  const commits = Object.fromEntries(
    Object.entries(state.commits).map(([id, c]) => [
      id,
      c.lane === from ? { ...c, lane: to } : c,
    ]),
  )
  return ok({ ...state, branches, head, commits })
}

function switchToNew(state: GitState, name: string, start?: string) {
  const created = createBranch(state, name, start)
  if (created.error) return created
  const moved = moveHead(created.state, { branch: name })
  if (moved.error) return moved
  return ok(moved.state, `Switched to a new branch '${name}'`)
}

function switchTo(state: GitState, target: string, allowDetach: boolean) {
  if (target in state.branches) {
    if (currentBranch(state) === target) {
      return ok(state, `Already on '${target}'`)
    }
    const moved = moveHead(state, { branch: target })
    return moved.error
      ? moved
      : ok(moved.state, `Switched to branch '${target}'`)
  }
  const id = resolveRef(state, target)
  if (!id) {
    return fail(
      state,
      `error: pathspec '${target}' did not match any file(s) known to git`,
    )
  }
  if (!allowDetach) {
    return fail(
      state,
      `fatal: a branch is expected, got commit '${target}'`,
      'hint: use --detach to look at a commit without a branch',
    )
  }
  const moved = moveHead(state, { detached: id })
  if (moved.error) return moved
  return ok(
    moved.state,
    `Note: switching to '${target}'. You are in 'detached HEAD' state.`,
    `HEAD is now at ${shortId(id)} ${state.commits[id].message}`,
  )
}

export function checkout(state: GitState, args: string[]): CommandResult {
  const { values, positional } = parseArgs(args, ['-b'])
  if (values['-b']) return switchToNew(state, values['-b'], positional[0])
  if (!positional[0]) return fail(state, 'error: tell checkout where to go')
  return switchTo(state, positional[0], true)
}

export function switchBranch(state: GitState, args: string[]): CommandResult {
  const { values, flags, positional } = parseArgs(args, ['-c'])
  if (values['-c']) return switchToNew(state, values['-c'], positional[0])
  if (!positional[0]) return fail(state, 'fatal: missing branch or commit')
  return switchTo(state, positional[0], flags.has('--detach'))
}

export function tag(state: GitState, args: string[]): CommandResult {
  const { flags, positional } = parseArgs(args, [])
  const [name, ref = 'HEAD'] = positional
  if (!name) return ok(state, ...Object.keys(state.tags).sort())
  if (flags.has('-d')) {
    if (!(name in state.tags))
      return fail(state, `error: tag '${name}' not found.`)
    const tags = { ...state.tags }
    delete tags[name]
    return ok({ ...state, tags }, `Deleted tag '${name}'`)
  }
  if (name in state.tags) {
    return fail(state, `fatal: tag '${name}' already exists`)
  }
  const at = resolveRef(state, ref)
  if (!at)
    return fail(state, `fatal: Failed to resolve '${ref}' as a valid ref.`)
  return ok({ ...state, tags: { ...state.tags, [name]: at } })
}
