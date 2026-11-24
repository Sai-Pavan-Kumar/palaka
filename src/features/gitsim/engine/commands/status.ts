import { currentBranch, headCommitId, headTree, ok, shortId } from '../repo'
import type { CommandResult, GitState, Tree } from '../types'

export type FileChange = 'new file' | 'modified' | 'deleted'

// What changed going from `from` to `to`, path by path.
export function diffTrees(from: Tree, to: Tree): [string, FileChange][] {
  const paths = [...new Set([...Object.keys(from), ...Object.keys(to)])].sort()
  const changes: [string, FileChange][] = []
  for (const path of paths) {
    if (from[path] === to[path]) continue
    if (!(path in from)) changes.push([path, 'new file'])
    else if (!(path in to)) changes.push([path, 'deleted'])
    else changes.push([path, 'modified'])
  }
  return changes
}

export type WorkingAreas = {
  staged: [string, FileChange][]
  unstaged: [string, FileChange][]
  untracked: string[]
}

export function workingAreas(state: GitState): WorkingAreas {
  const tracked = Object.fromEntries(
    Object.entries(state.work).filter(([path]) => path in state.index),
  )
  return {
    staged: diffTrees(headTree(state), state.index),
    // Only tracked files count as "not staged"; new ones are untracked.
    unstaged: diffTrees(state.index, tracked),
    untracked: Object.keys(state.work)
      .filter((path) => !(path in state.index))
      .sort(),
  }
}

function headLine(state: GitState): string {
  const branch = currentBranch(state)
  if (branch) return `On branch ${branch}`
  return `HEAD detached at ${shortId(headCommitId(state) ?? '')}`
}

function section(title: string, rows: string[]): string[] {
  return rows.length === 0 ? [] : [title, ...rows.map((row) => `    ${row}`)]
}

export function status(state: GitState): CommandResult {
  const { staged, unstaged, untracked } = workingAreas(state)
  const lines = [headLine(state)]
  if (!headCommitId(state)) lines.push('No commits yet')
  lines.push(
    ...section(
      'Changes to be committed:',
      staged.map(([path, kind]) => `${kind}: ${path}`),
    ),
    ...section(
      'Changes not staged for commit:',
      unstaged.map(([path, kind]) => `${kind}: ${path}`),
    ),
    ...section('Untracked files:', untracked),
  )
  if (staged.length + unstaged.length + untracked.length === 0) {
    lines.push('nothing to commit, working tree clean')
  }
  return ok(state, ...lines)
}
