import type { Tree } from './types'

export type MergedTree = { tree: Tree; conflicts: string[] }

export function conflictText(
  ours: string | undefined,
  theirs: string | undefined,
  theirsLabel: string,
): string {
  return [
    '<<<<<<< HEAD',
    ours ?? '',
    '=======',
    theirs ?? '',
    `>>>>>>> ${theirsLabel}`,
  ].join('\n')
}

// Per file: if only one side changed it since the base, take that side.
// Both sides changed it differently = conflict, written with markers so the
// viewer sees exactly what git shows in the file.
export function threeWayMerge(
  base: Tree,
  ours: Tree,
  theirs: Tree,
  theirsLabel: string,
): MergedTree {
  const tree: Tree = {}
  const conflicts: string[] = []
  const paths = new Set([...Object.keys(ours), ...Object.keys(theirs)])
  for (const path of [...paths].sort()) {
    const [o, t, b] = [ours[path], theirs[path], base[path]]
    let pick: string | undefined
    if (o === t || t === b) pick = o
    else if (o === b) pick = t
    else {
      conflicts.push(path)
      pick = conflictText(o, t, theirsLabel)
    }
    if (pick !== undefined) tree[path] = pick
  }
  return { tree, conflicts }
}

// Working directory after moving to `tree`: tracked files follow the tree,
// files git never tracked are left alone.
export function workFor(tree: Tree, oldWork: Tree, oldTracked: Tree): Tree {
  const untracked = Object.fromEntries(
    Object.entries(oldWork).filter(([path]) => !(path in oldTracked)),
  )
  return { ...untracked, ...tree }
}
