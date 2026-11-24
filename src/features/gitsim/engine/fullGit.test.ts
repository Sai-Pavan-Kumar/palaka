import { describe, expect, it } from 'vitest'
import { GIT_TEMPLATES } from '../templates'
import { headCommitId } from './repo'
import { runScript } from './runScript'

function last(script: string) {
  const steps = runScript(script)
  return steps[steps.length - 1]
}

const START = `git init
echo "home" > index.html
git add .
git commit -m "Home page"`

describe('every template', () => {
  for (const template of GIT_TEMPLATES) {
    it(`${template.label} runs with only its planned errors`, () => {
      const steps = runScript(template.script)
      const allowed = template.expectedErrors ?? []
      const surprises = steps.filter(
        (step, i) =>
          step.error &&
          !(allowed.includes(step.command) && i < steps.length - 1) &&
          !step.state.op,
      )
      expect(
        surprises.map((s) => `${s.command}: ${s.output.join(' ')}`),
      ).toEqual([])
      expect(steps.at(-1)!.error).toBe(false)
      for (const step of steps) expect(step.caption.length).toBeGreaterThan(10)
    })
  }
})

describe('merge', () => {
  const DIVERGED = `${START}
git switch -c feature
echo "a" > a.txt
git add .
git commit -m "A"
git switch main
echo "b" > b.txt
git add .
git commit -m "B"`

  it('fast-forwards when main has nothing new', () => {
    const step = last(
      `${START}\ngit switch -c f\ntouch x\ngit add .\ngit commit -m X\ngit switch main\ngit merge f`,
    )
    expect(step.output).toContain('Fast-forward')
    expect(step.state.branches.main).toBe(step.state.branches.f)
  })

  it('makes a two-parent commit with both files', () => {
    const { state } = last(`${DIVERGED}\ngit merge feature`)
    const tip = state.commits[state.branches.main]
    expect(tip.parents).toHaveLength(2)
    expect(Object.keys(state.work).sort()).toEqual([
      'a.txt',
      'b.txt',
      'index.html',
    ])
  })

  it('stops on a conflict, then add + commit finishes it', () => {
    const conflicted = last(
      `${START}\ngit switch -c x\necho "1" > index.html\ngit commit -am one\ngit switch main\necho "2" > index.html\ngit commit -am two\ngit merge x`,
    )
    expect(conflicted.state.op?.conflicts).toEqual(['index.html'])
    expect(conflicted.state.work['index.html']).toContain('<<<<<<< HEAD')
    const done = last(
      `${START}\ngit switch -c x\necho "1" > index.html\ngit commit -am one\ngit switch main\necho "2" > index.html\ngit commit -am two\ngit merge x\necho "3" > index.html\ngit add index.html\ngit commit`,
    )
    expect(done.error).toBe(false)
    expect(done.state.op).toBeNull()
    expect(done.state.commits[done.state.branches.main].parents).toHaveLength(2)
  })

  it('merge --abort puts everything back', () => {
    const { state } = last(
      `${START}\ngit switch -c x\necho "1" > index.html\ngit commit -am one\ngit switch main\necho "2" > index.html\ngit commit -am two\ngit merge x\ngit merge --abort`,
    )
    expect(state.op).toBeNull()
    expect(state.work['index.html']).toBe('2')
  })

  it('rebase copies commits onto main and leaves the old ones behind', () => {
    const { state } = last(`${DIVERGED}\ngit switch feature\ngit rebase main`)
    const tip = state.commits[state.branches.feature]
    expect(tip.parents).toEqual([state.branches.main])
    expect(state.head).toEqual({ branch: 'feature' })
    expect(state.order).toHaveLength(4)
  })

  it('rebase conflict continues after the fix', () => {
    const script = `${START}\ngit switch -c x\necho "1" > index.html\ngit commit -am one\ngit switch main\necho "2" > index.html\ngit commit -am two\ngit switch x\ngit rebase main`
    expect(last(script).state.op?.kind).toBe('rebase')
    const done = last(
      `${script}\necho "3" > index.html\ngit add .\ngit rebase --continue`,
    )
    expect(done.error).toBe(false)
    expect(done.state.head).toEqual({ branch: 'x' })
  })
})

describe('undo', () => {
  const TWO = `${START}\necho "a" > a.txt\ngit add .\ngit commit -m A`

  it('reset modes keep or drop the change', () => {
    expect(last(`${TWO}\ngit reset --soft HEAD~1`).state.index).toHaveProperty(
      'a.txt',
    )
    const mixed = last(`${TWO}\ngit reset HEAD~1`).state
    expect(mixed.index).not.toHaveProperty('a.txt')
    expect(mixed.work).toHaveProperty('a.txt')
    expect(
      last(`${TWO}\ngit reset --hard HEAD~1`).state.work,
    ).not.toHaveProperty('a.txt')
  })

  it('revert adds a commit that removes the file', () => {
    const { state } = last(`${TWO}\ngit revert HEAD`)
    expect(state.order).toHaveLength(3)
    expect(state.work).not.toHaveProperty('a.txt')
  })

  it('stash clears and pop brings back', () => {
    const stashed = last(`${START}\necho "x" >> index.html\ngit stash`).state
    expect(stashed.work['index.html']).toBe('home')
    const popped = last(
      `${START}\necho "x" >> index.html\ngit stash\ngit stash pop`,
    ).state
    expect(popped.work['index.html']).toBe('home\nx')
    expect(popped.stash).toHaveLength(0)
  })

  it('reflog records HEAD moves', () => {
    const step = last(`${TWO}\ngit reset --hard HEAD~1\ngit reflog`)
    expect(step.output[0]).toMatch(/HEAD@\{0\}: reset --hard HEAD~1/)
  })
})

describe('GitHub', () => {
  it('teammate commits stay on GitHub until fetch', () => {
    const script =
      'git clone https://github.com/t/app.git\nteammate commit "Fix"'
    const before = last(script).state
    const remoteTip = before.remote!.branches.main
    expect(before.local[remoteTip]).toBeUndefined()
    const after = last(`${script}\ngit fetch`).state
    expect(after.local[remoteTip]).toBe(true)
    expect(after.tracking.main).toBe(remoteTip)
    expect(after.branches.main).not.toBe(remoteTip)
  })

  it('push is rejected when behind, works after pull', () => {
    const script =
      'git clone https://github.com/t/app.git\ntouch a\ngit add .\ngit commit -m A\nteammate commit "B"\ngit push'
    expect(last(script).output[1]).toMatch(/rejected/)
    const done = last(`${script}\ngit pull\ngit push`)
    expect(done.error).toBe(false)
    expect(done.state.remote!.branches.main).toBe(headCommitId(done.state))
  })
})
