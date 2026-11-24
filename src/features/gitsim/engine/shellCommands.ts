import { fail, ok } from './repo'
import type { CommandResult, GitState } from './types'

// Lessons need files to change between commits. These few shell commands
// do that without an editor: touch makes an empty file, echo writes or
// appends a line.
function touch(state: GitState, paths: string[]): CommandResult {
  if (paths.length === 0) return fail(state, 'touch: missing file operand')
  const work = { ...state.work }
  for (const path of paths) work[path] ??= ''
  return ok({ ...state, work })
}

function echo(state: GitState, words: string[]): CommandResult {
  const at = words.findIndex((word) => word === '>' || word === '>>')
  const text = words.slice(0, at === -1 ? undefined : at).join(' ')
  if (at === -1) return ok(state, text)
  const path = words[at + 1]
  if (!path) return fail(state, 'syntax error: expected a file after >')
  const before = state.work[path] ?? ''
  const appended = before === '' ? text : `${before}\n${text}`
  const content = words[at] === '>>' ? appended : text
  return ok({ ...state, work: { ...state.work, [path]: content } })
}

function remove(state: GitState, paths: string[]): CommandResult {
  const work = { ...state.work }
  for (const path of paths) {
    if (!(path in work)) {
      return fail(state, `rm: cannot remove '${path}': No such file`)
    }
    delete work[path]
  }
  return ok({ ...state, work })
}

function list(state: GitState): CommandResult {
  return ok(state, Object.keys(state.work).sort().join('  '))
}

export function runShellCommand(
  state: GitState,
  name: string,
  args: string[],
): CommandResult | null {
  if (name === 'touch') return touch(state, args)
  if (name === 'echo') return echo(state, args)
  if (name === 'rm') return remove(state, args)
  if (name === 'ls') return list(state)
  return null
}
