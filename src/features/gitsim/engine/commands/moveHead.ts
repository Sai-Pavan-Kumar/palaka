import { fail, headTree, ok } from '../repo'
import type { CommandResult, GitState, Head, Tree } from '../types'

function treeOf(state: GitState, head: Head): Tree {
  const id = 'detached' in head ? head.detached : state.branches[head.branch]
  return id ? state.commits[id].tree : {}
}

// Moving HEAD rewrites tracked files to the target commit. Uncommitted
// changes ride along, unless the same file also differs between the two
// commits: then git refuses rather than lose work, and so do we.
export function moveHead(state: GitState, head: Head): CommandResult {
  const from = headTree(state)
  const to = treeOf(state, head)
  const work: Tree = { ...state.work }
  const index: Tree = { ...to }
  const blocked: string[] = []
  const paths = new Set([
    ...Object.keys(from),
    ...Object.keys(to),
    ...Object.keys(state.index),
  ])
  for (const path of paths) {
    const staged = state.index[path] !== from[path]
    const edited = path in state.index && state.work[path] !== state.index[path]
    const dirty = staged || edited
    if (dirty && from[path] !== to[path]) {
      blocked.push(path)
      continue
    }
    if (dirty) {
      if (path in state.index) index[path] = state.index[path]
      else delete index[path]
      continue
    }
    if (path in to) work[path] = to[path]
    else delete work[path]
  }
  if (blocked.length > 0) {
    return fail(
      state,
      'error: Your local changes to the following files would be overwritten by checkout:',
      ...blocked.map((path) => `    ${path}`),
      'Please commit your changes or stash them before you switch branches.',
    )
  }
  return ok({ ...state, head, work, index })
}
