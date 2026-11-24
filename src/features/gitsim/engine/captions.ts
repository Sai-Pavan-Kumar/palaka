import { parseArgs, tokenize } from './parseCommand'
import { currentBranch, headCommitId, shortId } from './repo'
import type { CommandResult, GitState } from './types'

type Context = { before: GitState; result: CommandResult; args: string[] }

const READ_ONLY = 'Only looks. Nothing changed.'

function newCommitText({ before, result }: Context): string {
  const tip = headCommitId(result.state)
  const where = currentBranch(result.state)
  const id = tip ? shortId(tip) : ''
  if (before.op?.kind === 'merge') {
    return `Merge finished: commit ${id} has two parents.`
  }
  return where
    ? `Saved a snapshot: commit ${id}. The ${where} label moved forward to it.`
    : `Saved commit ${id}, but no branch points at it (detached HEAD).`
}

function commitCaption(ctx: Context): string {
  if (ctx.args.includes('--amend')) {
    return 'Replaced the last commit with a new one. The old one is left behind (faded).'
  }
  return newCommitText(ctx)
}

function branchCaption({ args, before, result }: Context): string {
  const { flags, positional } = parseArgs(args, [])
  if (flags.has('-d') || flags.has('-D')) {
    return `Removed the label ${positional[0]}. Its commits are not deleted.`
  }
  if (flags.has('-m')) return 'Renamed the branch. Only the label changed.'
  if (positional.length === 0)
    return 'Lists branches. The * marks where HEAD is.'
  const name = positional[0]
  const added = !(name in before.branches) && name in result.state.branches
  return added
    ? `New branch ${name}: just a new label on the current commit. No files were copied.`
    : READ_ONLY
}

function moveCaption({ result, before }: Context): string {
  const where = currentBranch(result.state)
  const created = where && !(where in before.branches)
  if (created) {
    return `New branch ${where} on this commit, and HEAD moved onto it. No files changed.`
  }
  if (!where) {
    return 'Detached HEAD: you are on a commit, not on a branch. New commits here belong to no branch.'
  }
  return `HEAD now points at ${where}. Your files changed to match that branch.`
}

function mergeCaption({ before, result, args }: Context): string {
  const out = result.output.join(' ')
  if (args.includes('--abort'))
    return 'Merge cancelled. Everything is back as before.'
  if (result.state.op?.kind === 'merge') {
    const files = result.state.op.conflicts.join(', ')
    return `Conflict: both branches changed ${files}. Fix the file, then git add and git commit.`
  }
  if (out.includes('Fast-forward')) {
    return `Fast-forward: ${currentBranch(before)} just slid ahead. No new commit was needed.`
  }
  if (out.includes('Squash'))
    return 'All changes are staged as one. Commit them as a single commit.'
  if (out.includes('Already up to date')) return 'Nothing new to merge.'
  return 'A merge commit joins both histories. It has two parents.'
}

function rebaseCaption({ result, args }: Context): string {
  if (args.includes('--abort'))
    return 'Rebase cancelled. The branch is back where it was.'
  if (result.state.op?.kind === 'rebase') {
    return 'Rebase stopped on a conflict. Fix the file, git add it, then git rebase --continue.'
  }
  return 'Rebase copied the commits onto the new base. They get new ids; the old ones are left behind (faded).'
}

function resetCaption({ args }: Context): string {
  if (args.includes('--soft'))
    return 'The branch moved back. The changes are still staged.'
  if (args.includes('--hard')) {
    return 'The branch moved back and the uncommitted changes are gone. Careful: this deletes work.'
  }
  return 'The branch moved back. The changes are in the working directory, not staged.'
}

function remoteCaption(name: string, { result }: Context): string {
  const out = result.output.join(' ')
  if (name === 'push') {
    if (out.includes('rejected'))
      return "Rejected: GitHub has commits you don't have. Pull first."
    return out.includes('up-to-date')
      ? 'GitHub already has everything.'
      : 'Sent your commits to GitHub.'
  }
  if (name === 'fetch') {
    return out
      ? 'Downloaded new commits. origin/ labels moved; your own branches did not.'
      : 'Nothing new on GitHub.'
  }
  if (name === 'pull') {
    if (result.state.op)
      return 'Pull = fetch + merge, and the merge hit a conflict. Fix, add, commit.'
    return 'Pull = fetch + merge: downloaded the new commits and joined them into your branch.'
  }
  if (name === 'clone')
    return 'Copied the whole repo from GitHub to your laptop, with all its history.'
  return "Linked this repo to GitHub under the name 'origin'."
}

const SIMPLE: Record<string, string> = {
  init: 'Git now tracks this folder. It made a hidden .git folder. No commits yet.',
  add: 'Staged: these changes will go into the next commit.',
  status:
    'status shows the working directory, the staging area and the last commit.',
  log: 'log lists the commits, newest first.',
  diff: 'diff shows the lines that changed.',
  show: 'show prints one commit and its change.',
  reflog:
    'reflog remembers every place HEAD has been, even commits no branch points at.',
  tag: 'A tag is a label that never moves, usually for a release.',
  'cherry-pick': 'Copied one commit onto the current branch as a new commit.',
  revert:
    'A new commit that undoes an old one. History stays, so it is safe on shared branches.',
  restore: 'Put the file back the way it was.',
  stash:
    'Stash puts changes aside (or brings them back), so you can switch work.',
}

function gitCaption(name: string, ctx: Context): string {
  if (name === 'commit') return commitCaption(ctx)
  if (name === 'branch') return branchCaption(ctx)
  if (name === 'checkout' || name === 'switch') return moveCaption(ctx)
  if (name === 'merge') return mergeCaption(ctx)
  if (name === 'rebase') return rebaseCaption(ctx)
  if (name === 'reset') return resetCaption(ctx)
  if (['push', 'fetch', 'pull', 'clone', 'remote'].includes(name)) {
    return remoteCaption(name, ctx)
  }
  return SIMPLE[name] ?? READ_ONLY
}

function shellCaption(program: string, args: string[]): string {
  const file = args.at(-1) ?? ''
  if (program === 'teammate')
    return "A teammate pushed to GitHub. Your laptop doesn't know yet."
  if (program === 'rm') return `Deleted ${file} from the working directory.`
  if (program === 'ls') return READ_ONLY
  return `${file} changed in the working directory. Git has not saved it yet.`
}

// One plain sentence per step, for the viewer who has never used git.
export function captionFor(
  command: string,
  before: GitState,
  result: CommandResult,
): string {
  if (!command)
    return 'An empty project folder. Press Space to run the first command.'
  const [program, ...rest] = tokenize(command)
  if (result.output.some((line) => line.includes('[rejected]'))) {
    return "Rejected: GitHub has commits you don't have. Pull first."
  }
  if (result.error && !result.state.op) {
    return 'Git said no. Nothing changed. Read its message below.'
  }
  if (program !== 'git') return shellCaption(program, rest)
  const [name, ...args] = rest
  return gitCaption(name, { before, result, args })
}
