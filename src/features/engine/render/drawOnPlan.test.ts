import { describe, expect, it } from 'vitest'
import { createText, DEFAULT_STYLE } from '../model/shapeFactory'
import { getDrawDuration, getDrawPlan } from './drawOnPlan'

describe('getDrawPlan', () => {
  it('reveals text word by word by default, keeping its animation', () => {
    const shape = {
      ...createText(
        { x: 50, y: 50 },
        { ...DEFAULT_STYLE, textAnimation: 'slide-up' },
      ),
      text: 'one two three',
    }
    const plan = getDrawPlan(shape)
    expect(plan).toEqual({ kind: 'words', units: 3, animation: 'slide-up' })
  })

  it('counts letters for the typewriter', () => {
    const shape = {
      ...createText(
        { x: 0, y: 0 },
        { ...DEFAULT_STYLE, textAnimation: 'typewriter' },
      ),
      text: 'ab cd',
    }
    expect(getDrawPlan(shape)).toMatchObject({ kind: 'words', units: 4 })
  })

  it('keeps the whole-box wipe when set to all at once', () => {
    const shape = {
      ...createText(
        { x: 0, y: 0 },
        { ...DEFAULT_STYLE, textAnimation: 'blur-in' },
      ),
      text: 'hello world',
      textReveal: 'whole' as const,
    }
    const plan = getDrawPlan(shape)
    expect(plan?.kind).toBe('wipe')
    expect(plan?.kind === 'wipe' && plan.animation).toBe('blur-in')
  })

  it('paces word reveals by word count, within limits', () => {
    const words = (n: number) => ({
      ...createText({ x: 0, y: 0 }, DEFAULT_STYLE),
      text: Array.from({ length: n }, () => 'w').join(' '),
    })
    expect(getDrawDuration(words(10))).toBeCloseTo(1.1)
    expect(getDrawDuration(words(1))).toBe(0.35)
    expect(getDrawDuration(words(200))).toBe(4)
  })
})
