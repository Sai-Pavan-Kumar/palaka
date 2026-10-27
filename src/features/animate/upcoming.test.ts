import { describe, expect, it } from 'vitest'
import { createText, DEFAULT_STYLE } from '../engine/model/shapeFactory'
import { isUpcoming } from './motion'

const at = (revealStep?: number, exitStep?: number) => ({
  ...createText({ x: 0, y: 0 }, DEFAULT_STYLE),
  revealStep,
  ...(exitStep && { exit: { style: 'fade' as const, step: exitStep } }),
})

describe('isUpcoming', () => {
  it('is true only for shapes whose turn has not come yet', () => {
    expect(isUpcoming(at(3), 2)).toBe(true)
    expect(isUpcoming(at(2), 2)).toBe(false)
    expect(isUpcoming(at(), 0)).toBe(false)
  })

  it('never brings back a shape that already exited', () => {
    expect(isUpcoming(at(1, 2), 3)).toBe(false)
  })
})
