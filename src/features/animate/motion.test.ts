import { describe, expect, it } from 'vitest'
import { getStepItems, normalizeSteps } from '../engine/model/revealSteps'
import type { GeoShape, Page } from '../engine/model/types'
import { isShownAt, motionAt, motionSeconds } from './motion'

const box: GeoShape = {
  id: 'box',
  type: 'geo',
  geo: 'rectangle',
  x: 0,
  y: 0,
  w: 100,
  h: 100,
  color: 'black',
  size: 'm',
  fill: 'none',
  dash: 'clean',
  opacity: 1,
  revealStep: 1,
  pulseStep: 2,
  exit: { style: 'fade', step: 3 },
}

describe('motion steps', () => {
  it('names what each step does to the shape', () => {
    expect(motionAt(box, 1)).toBe('enter')
    expect(motionAt(box, 2)).toBe('pulse')
    expect(motionAt(box, 3)).toBe('exit')
    expect(motionAt(box, null)).toBeNull()
  })

  it('stays mounted while its exit plays, then leaves', () => {
    expect(isShownAt(box, 0, null)).toBe(false)
    expect(isShownAt(box, 2, null)).toBe(true)
    expect(isShownAt(box, 3, 3)).toBe(true)
    expect(isShownAt(box, 3, null)).toBe(false)
  })

  it('scales with the chosen pace', () => {
    expect(
      motionSeconds({ ...box, animSpeed: 'slow' }, 'enter'),
    ).toBeGreaterThan(motionSeconds(box, 'enter'))
  })

  it('counts exit and pulse as reveal steps and renumbers them', () => {
    const gappy = {
      ...box,
      revealStep: 2,
      pulseStep: 5,
      exit: { style: 'fade' as const, step: 9 },
    }
    const page: Page = {
      id: 'p',
      name: 'P',
      shapes: { box: gappy },
      order: ['box'],
    }
    const items = getStepItems(normalizeSteps(page))
    expect(items.map((i) => [i.kind, i.step])).toEqual([
      ['shape', 1],
      ['pulse', 2],
      ['exit', 3],
    ])
  })
})
