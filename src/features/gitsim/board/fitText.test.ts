import { describe, expect, it } from 'vitest'
import { clip, wrap } from './fitText'

describe('fitText', () => {
  it('clips with an ellipsis', () => {
    expect(clip('feature/login-page', 10)).toBe('feature/l…')
    expect(clip('main', 10)).toBe('main')
  })

  it('wraps on spaces and marks cut text', () => {
    expect(wrap('one two three four', 9, 3)).toEqual([
      'one two',
      'three',
      'four',
    ])
    const cut = wrap('one two three four five six', 9, 2)
    expect(cut).toHaveLength(2)
    expect(cut[1].endsWith('…')).toBe(true)
    for (const line of cut) expect(line.length).toBeLessThanOrEqual(9)
  })
})
