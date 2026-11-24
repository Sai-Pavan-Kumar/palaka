import { add, commit, init } from './commands/basics'
import { diff, log, reflog, show } from './commands/inspect'
import { merge } from './commands/merge'
import { branch, checkout, switchBranch, tag } from './commands/refs'
import { clone, fetch, pull, push, remote, teammate } from './commands/remote'
import { cherryPick, rebase } from './commands/replay'
import { status } from './commands/status'
import { reset, restore, revert, stash } from './commands/undo'
import { captionFor } from './captions'
import { isSkippedLine, tokenize } from './parseCommand'
import { fail, headCommitId, NOT_A_REPO } from './repo'
import { runShellCommand } from './shellCommands'
import {
  EMPTY_STATE,
  type CommandResult,
  type GitState,
  type GitStep,
} from './types'

type GitCommand = (state: GitState, args: string[]) => CommandResult

const GIT_COMMANDS: Record<string, GitCommand> = {
  add,
  commit,
  status,
  log,
  diff,
  show,
  reflog,
  branch,
  checkout,
  switch: switchBranch,
  tag,
  merge,
  rebase,
  'cherry-pick': cherryPick,
  reset,
  revert,
  restore,
  stash,
  remote,
  fetch,
  pull,
  push,
}

function runGit(state: GitState, args: string[]): CommandResult {
  const [name, ...rest] = args
  if (!name) return fail(state, 'usage: git <command> [<args>]')
  if (name === 'init') return init(state)
  if (name === 'clone') return clone(state, rest)
  const command = GIT_COMMANDS[name]
  // Saying so beats drawing a picture that quietly differs from real git.
  if (!command) {
    return fail(state, `Palaka's Git does not know 'git ${name}' yet`)
  }
  if (!state.initialized) return fail(state, NOT_A_REPO)
  return command(state, rest)
}

export function runLine(state: GitState, line: string): CommandResult {
  const [program, ...args] = tokenize(line)
  if (program === 'git') return runGit(state, args)
  if (program === 'teammate') return teammate(state, args)
  const shell = runShellCommand(state, program, args)
  return shell ?? fail(state, `${program}: command not found`)
}

// reflog is the safety net lesson: every move of HEAD is written down.
function withReflog(before: GitState, result: CommandResult, line: string) {
  const id = headCommitId(result.state)
  if (!id || id === headCommitId(before)) return result
  const action = line.replace(/^git\s+/, '')
  const reflog = [...result.state.reflog, { id, action }]
  return { ...result, state: { ...result.state, reflog } }
}

// Computed once per script: stepping back and forth is just an index, and
// every take of a recording shows exactly the same thing.
export function runScript(script: string): GitStep[] {
  const steps: GitStep[] = [
    {
      command: '',
      state: EMPTY_STATE,
      output: [],
      error: false,
      caption: captionFor('', EMPTY_STATE, {
        state: EMPTY_STATE,
        output: [],
        error: false,
      }),
    },
  ]
  for (const raw of script.split('\n')) {
    if (isSkippedLine(raw)) continue
    const command = raw.trim()
    const before = steps[steps.length - 1].state
    const result = withReflog(before, runLine(before, command), command)
    steps.push({
      command,
      ...result,
      caption: captionFor(command, before, result),
    })
  }
  return steps
}
