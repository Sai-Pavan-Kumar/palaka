import { describe, expect, it } from 'vitest'
import { runScript } from './runScript'
import { tokenize } from './parseCommand'

function last(script: string) {
  const steps = runScript(script)
  return steps[steps.length - 1]
}

const BASE = `git init
echo "hello" > readme.md
git add .
git commit -m "First commit"`

describe('tokenize', () => {
  it('keeps quoted words together', () => {
    expect(tokenize(`git commit -m "Add login page"`)).toEqual([
      'git',
      'commit',
      '-m',
      'Add login page',
    ])
  })
})

describe('runScript basics', () => {
  it('starts with an empty step and skips comments and blank lines', () => {
    const steps = runScript('# setup\n\ngit init')
    expect(steps).toHaveLength(2)
    expect(steps[1].output).toEqual([
      'Initialized empty Git repository in .git/',
    ])
  })

  it('refuses git commands before init', () => {
    const step = last('git status')
    expect(step.error).toBe(true)
    expect(step.output[0]).toMatch(/not a git repository/)
  })

  it('makes a root commit on main and moves the branch', () => {
    const step = last(BASE)
    const { state } = step
    expect(step.output[0]).toMatch(
      /^\[main \(root-commit\) [0-9a-f]{7}\] First commit$/,
    )
    expect(state.order).toHaveLength(1)
    expect(state.branches.main).toBe(state.order[0])
    expect(state.commits[state.order[0]].lane).toBe('main')
  })

  it('gives the same ids every run', () => {
    expect(last(BASE).state.order).toEqual(last(BASE).state.order)
  })

  it('refuses an empty commit and a commit with no message', () => {
    expect(last(`${BASE}\ngit commit -m "Again"`).output[0]).toBe(
      'nothing to commit, working tree clean',
    )
    expect(last(`${BASE}\ngit commit`).error).toBe(true)
  })

  it('commit -a stages tracked files but not new ones', () => {
    const step = last(
      `${BASE}\necho "more" >> readme.md\ntouch new.txt\ngit commit -am "Edit"`,
    )
    expect(step.error).toBe(false)
    expect(step.state.index).not.toHaveProperty('new.txt')
  })

  it('reports status in the three areas', () => {
    const step = last(
      `${BASE}\necho "x" >> readme.md\ntouch a.txt\ntouch b.txt\ngit add a.txt\ngit status`,
    )
    expect(step.output).toEqual([
      'On branch main',
      'Changes to be committed:',
      '    new file: a.txt',
      'Changes not staged for commit:',
      '    modified: readme.md',
      'Untracked files:',
      '    b.txt',
    ])
  })

  it('names unknown commands instead of guessing', () => {
    expect(last('git init\ngit frobnicate').output[0]).toBe(
      "Palaka's Git does not know 'git frobnicate' yet",
    )
    expect(last('vim a.txt').output[0]).toBe('vim: command not found')
  })
})

describe('branches and HEAD', () => {
  const FEATURE = `${BASE}
git switch -c feature
echo "login" > login.js
git add login.js
git commit -m "Add login"`

  it('creates, switches and commits on a feature lane', () => {
    const { state } = last(FEATURE)
    const tip = state.branches.feature
    expect(state.head).toEqual({ branch: 'feature' })
    expect(state.commits[tip].lane).toBe('feature')
    expect(state.commits[tip].parents).toEqual([state.branches.main])
  })

  it('switching back removes files only the other branch has', () => {
    const { state } = last(`${FEATURE}\ngit checkout main`)
    expect(state.work).not.toHaveProperty('login.js')
    expect(state.head).toEqual({ branch: 'main' })
  })

  it('refuses to switch over a conflicting local change', () => {
    const step = last(`${FEATURE}\necho "edit" >> login.js\ngit checkout main`)
    expect(step.error).toBe(true)
    expect(step.output[1]).toBe('    login.js')
  })

  it('log shows decorations, newest first', () => {
    const step = last(`${FEATURE}\ngit tag v1\ngit log --oneline`)
    expect(step.output[0]).toMatch(/\(HEAD -> feature, tag: v1\) Add login$/)
    expect(step.output[1]).toMatch(/\(main\) First commit$/)
  })

  it('detached HEAD commits move HEAD, not a branch', () => {
    const { state } = last(
      `${BASE}\ngit checkout HEAD\necho "y" >> readme.md\ngit commit -am "Try"`,
    )
    expect('detached' in state.head).toBe(true)
    expect(state.commits[state.order[1]].lane).toBe('HEAD')
    expect(state.branches.main).toBe(state.order[0])
  })

  it('switch needs --detach for a commit, branch -d guards unmerged work', () => {
    expect(last(`${BASE}\ngit tag v1\ngit switch v1`).error).toBe(true)
    const step = last(`${FEATURE}\ngit switch main\ngit branch -d feature`)
    expect(step.output[0]).toMatch(/not fully merged/)
    expect(
      last(`${FEATURE}\ngit switch main\ngit branch -D feature`).error,
    ).toBe(false)
  })

  it('resolves HEAD~1', () => {
    const step = last(`${FEATURE}\ngit branch old HEAD~1`)
    expect(step.state.branches.old).toBe(step.state.branches.main)
  })
})
