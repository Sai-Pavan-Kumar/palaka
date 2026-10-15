import { describe, expect, it } from 'vitest'
import { createText, DEFAULT_STYLE } from '../model/shapeFactory'
import { getDrawPlan } from './drawOnPlan'

describe('getDrawPlan', () => {
  it('assigns text animation from text shape', () => {
    const textShape = createText(
      { x: 50, y: 50 },
      { ...DEFAULT_STYLE, textAnimation: 'typewriter' },
    )
    const plan = getDrawPlan(textShape)

    expect(plan).not.toBeNull()
    expect(plan?.kind).toBe('wipe')
    if (plan?.kind === 'wipe') {
      expect(plan.animation).toBe('typewriter')
    }
  })

  it('defaults text animation to wipe if undefined', () => {
    const textShape = createText({ x: 10, y: 10 }, DEFAULT_STYLE)
    // simulate legacy shape without textAnimation
    const legacyShape = { ...textShape, textAnimation: undefined }
    const plan = getDrawPlan(legacyShape)

    expect(plan).not.toBeNull()
    expect(plan?.kind).toBe('wipe')
    if (plan?.kind === 'wipe') {
      expect(plan.animation).toBe('wipe')
    }
  })

  it('supports blur-in and slide-up animations', () => {
    const slideShape = createText(
      { x: 0, y: 0 },
      { ...DEFAULT_STYLE, textAnimation: 'slide-up' },
    )
    const blurShape = createText(
      { x: 0, y: 0 },
      { ...DEFAULT_STYLE, textAnimation: 'blur-in' },
    )

    const slidePlan = getDrawPlan(slideShape)
    const blurPlan = getDrawPlan(blurShape)

    expect(slidePlan?.kind === 'wipe' && slidePlan.animation).toBe('slide-up')
    expect(blurPlan?.kind === 'wipe' && blurPlan.animation).toBe('blur-in')
  })
})
