import { describe, expect, it } from 'vitest'
import { isTapGesture } from './handTools'

describe('isTapGesture', () => {
  it('accepts a quick press that stays in place', () => {
    expect(isTapGesture(100, 2)).toBe(true)
  })

  it('treats a slow press as no tap', () => {
    expect(isTapGesture(400, 0)).toBe(false)
  })

  it('treats a quick flick as no tap', () => {
    expect(isTapGesture(100, 20)).toBe(false)
  })
})
