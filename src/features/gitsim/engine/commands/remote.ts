import { parseArgs } from '../parseCommand'
import { addCommit, ancestors, currentBranch, fail, ok, shortId } from '../repo'
import type { CommandResult, GitState } from '../types'
import { mergeInto } from './merge'
import { rebase } from './replay'

const NO_REMOTE = "fatal: 'origin' does not appear to be a git repository"

export function remote(state: GitState, args: string[]): CommandResult {
  const { flags, positional } = parseArgs(args, [])
  const [sub, name, url] = positional
  if (sub === 'add') {
    if (name !== 'origin')
      return fail(state, 'Palaka uses one remote, named origin.')
    if (!url) return fail(state, 'usage: git remote add origin <url>')
    if (state.remote) return fail(state, 'error: remote origin already exists.')
    return ok({ ...state, remote: { url, branches: {} } })
  }
  if (!state.remote) return ok(state)
  if (flags.has('-v')) {
    const { url: at } = state.remote
    return ok(state, `origin\t${at} (fetch)`, `origin\t${at} (push)`)
  }
  return ok(state, 'origin')
}

// A clone needs a repo that already exists on GitHub; the lesson's repo
// starts with one commit, like a repo created with a README.
export function clone(state: GitState, args: string[]): CommandResult {
  const url = args[0]
  if (!url) return fail(state, 'fatal: You must specify a repository to clone.')
  if (state.initialized) {
    return fail(
      state,
      'fatal: destination path already exists and is not an empty directory.',
    )
  }
  const folder =
    url
      .split('/')
      .pop()
      ?.replace(/\.git$/, '') || 'repo'
  const tree = { 'README.md': `# ${folder}` }
  const made = addCommit(state, {
    message: 'Initial commit',
    parents: [],
    tree,
    lane: 'main',
  })
  const next: GitState = {
    ...made.state,
    initialized: true,
    head: { branch: 'main' },
    branches: { main: made.id },
    remote: { url, branches: { main: made.id } },
    tracking: { main: made.id },
    work: { ...tree },
    index: { ...tree },
  }
  return ok(next, `Cloning into '${folder}'...`, 'done.')
}

function fetchAll(state: GitState): CommandResult {
  if (!state.remote) return fail(state, NO_REMOTE)
  const lines: string[] = []
  const local = { ...state.local }
  for (const [name, tip] of Object.entries(state.remote.branches)) {
    const was = state.tracking[name]
    if (was === tip) continue
    lines.push(
      was
        ? `   ${shortId(was)}..${shortId(tip)}  ${name} -> origin/${name}`
        : ` * [new branch]      ${name} -> origin/${name}`,
    )
    for (const id of ancestors(state, tip)) local[id] = true
  }
  const next = { ...state, local, tracking: { ...state.remote.branches } }
  return ok(
    next,
    ...(lines.length > 0 ? [`From ${state.remote.url}`, ...lines] : []),
  )
}

export function fetch(state: GitState): CommandResult {
  return fetchAll(state)
}

export function pull(state: GitState, args: string[]): CommandResult {
  const { flags } = parseArgs(args, [])
  const fetched = fetchAll(state)
  if (fetched.error) return fetched
  const branch = currentBranch(fetched.state)
  if (!branch || !(branch in fetched.state.tracking)) {
    return fail(
      fetched.state,
      'There is no tracking information for the current branch.',
    )
  }
  const joined = flags.has('--rebase')
    ? rebase(fetched.state, [`origin/${branch}`])
    : mergeInto(fetched.state, `origin/${branch}`)
  return { ...joined, output: [...fetched.output, ...joined.output] }
}

function rejected(state: GitState, url: string, branch: string): CommandResult {
  return fail(
    state,
    `To ${url}`,
    ` ! [rejected]        ${branch} -> ${branch} (fetch first)`,
    "error: failed to push some refs: GitHub has commits you don't have.",
    "hint: run 'git pull', then push again.",
  )
}

export function push(state: GitState, args: string[]): CommandResult {
  const { flags, positional } = parseArgs(args, [])
  if (!state.remote)
    return fail(state, 'fatal: No configured push destination.')
  const branch =
    positional.find((word) => word !== 'origin') ?? currentBranch(state)
  const tip = branch ? state.branches[branch] : undefined
  if (!branch || !tip) {
    return fail(
      state,
      `error: src refspec ${branch ?? 'HEAD'} does not match any`,
    )
  }
  const { url, branches } = state.remote
  const was = branches[branch]
  if (was === tip) return ok(state, 'Everything up-to-date')
  const force = flags.has('--force') || flags.has('-f')
  if (was && !ancestors(state, tip).has(was) && !force)
    return rejected(state, url, branch)
  const next: GitState = {
    ...state,
    remote: { url, branches: { ...branches, [branch]: tip } },
    tracking: { ...state.tracking, [branch]: tip },
  }
  const line = was
    ? `   ${shortId(was)}..${shortId(tip)}  ${branch} -> ${branch}`
    : ` * [new branch]      ${branch} -> ${branch}`
  return ok(next, `To ${url}`, force && was ? line.replace('..', '...') : line)
}

// Lesson-only: someone else pushes to GitHub, so the laptop falls behind.
export function teammate(state: GitState, args: string[]): CommandResult {
  const { positional } = parseArgs(args, [])
  const [sub, message, file = 'README.md'] = positional
  if (sub !== 'commit' || !message) {
    return fail(state, 'usage: teammate commit "message" [file]')
  }
  const tip = state.remote?.branches.main
  if (!state.remote || !tip)
    return fail(state, 'GitHub has no main branch yet.')
  const before = state.commits[tip].tree
  const text = before[file]
    ? `${before[file]}\nteammate: ${message}`
    : `teammate: ${message}`
  const made = addCommit(state, {
    message,
    parents: [tip],
    tree: { ...before, [file]: text },
    lane: 'main',
    onLaptop: false,
  })
  const branches = { ...state.remote.branches, main: made.id }
  return ok(
    { ...made.state, remote: { ...state.remote, branches } },
    `(A teammate pushed "${message}" to GitHub)`,
  )
}
