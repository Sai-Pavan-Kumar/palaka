// File path → content. Content is only compared, never shown in full, so a
// short string per file is enough to tell "changed" from "same".
export type Tree = Record<string, string>

export type Commit = {
  id: string
  parents: string[]
  message: string
  // The branch HEAD was on when this commit was made ('HEAD' when detached).
  // Drawing a commit on the lane it was born on keeps a merged branch's
  // history visibly separate, which is the picture beginners need.
  lane: string
  tree: Tree
}

export type Head = { branch: string } | { detached: string }

// What --abort puts back.
export type Saved = {
  head: Head
  branches: Record<string, string>
  work: Tree
  index: Tree
}

export type Operation =
  | {
      kind: 'merge'
      theirs: string
      message: string
      conflicts: string[]
      before: Saved
    }
  | {
      kind: 'rebase'
      // The commit being copied right now, then the ones still to copy.
      current: string
      todo: string[]
      branch: string | null
      upstream: string
      conflicts: string[]
      before: Saved
    }
  | {
      kind: 'cherry-pick'
      current: string
      conflicts: string[]
      before: Saved
    }

export type StashEntry = { base: Tree; work: Tree; index: Tree; label: string }

export type Remote = { url: string; branches: Record<string, string> }

export type ReflogEntry = { id: string; action: string }

export type GitState = {
  initialized: boolean
  commits: Record<string, Commit>
  // Creation order: the graph's left-to-right time axis.
  order: string[]
  // Commits the laptop has. A teammate's push exists only on GitHub until
  // a fetch, and that gap is the whole lesson of fetch vs pull.
  local: Record<string, true>
  branches: Record<string, string>
  tags: Record<string, string>
  head: Head
  work: Tree
  index: Tree
  op: Operation | null
  stash: StashEntry[]
  remote: Remote | null
  // origin/<branch> as last fetched or pushed.
  tracking: Record<string, string>
  reflog: ReflogEntry[]
}

export type CommandResult = {
  state: GitState
  output: string[]
  error: boolean
}

export type GitStep = CommandResult & {
  // The script line as typed; empty for the starting step.
  command: string
  caption: string
}

export const EMPTY_STATE: GitState = {
  initialized: false,
  commits: {},
  order: [],
  local: {},
  branches: {},
  tags: {},
  head: { branch: 'main' },
  work: {},
  index: {},
  op: null,
  stash: [],
  remote: null,
  tracking: {},
  reflog: [],
}
