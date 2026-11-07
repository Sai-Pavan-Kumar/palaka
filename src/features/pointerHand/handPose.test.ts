import { describe, expect, it } from 'vitest'
import { getGripTargetX, getHandPose } from './handPose'
import { HANDS, type HandId } from './handSettings'

const board = { width: 1000, height: 600 }

const gripAt = { x: 700, y: 672 }

// The fingertip's board position, worked back from the pose.
function fingertip(pose: ReturnType<typeof getHandPose>, id: HandId) {
  const art = HANDS[id]
  const wristToTip = (art.wrist - art.tip) * pose.imageHeight
  const localX = (art.tipX - art.rodX) * pose.imageWidth
  const localY = -(pose.rodLength + wristToTip)
  const cos = Math.cos(pose.rotation)
  const sin = Math.sin(pose.rotation)
  return {
    x: gripAt.x + localX * cos - localY * sin,
    y: gripAt.y + localX * sin + localY * cos,
  }
}

describe('getHandPose', () => {
  it.each(Object.keys(HANDS) as HandId[])(
    'puts the %s fingertip on the pointer',
    (id) => {
      for (const pointer of [
        { x: 400, y: 300 },
        { x: 20, y: 20 },
        { x: 980, y: 500 },
      ]) {
        const pose = getHandPose(pointer, gripAt, board, 0, HANDS[id])
        const tip = fingertip(pose, id)
        expect(tip.x).toBeCloseTo(pointer.x)
        expect(tip.y).toBeCloseTo(pointer.y)
      }
    },
  )

  it('shrinks the hand on a tap and keeps the tip in place', () => {
    const pointer = { x: 400, y: 300 }
    const rest = getHandPose(pointer, gripAt, board, 0, HANDS.lavender)
    const tapped = getHandPose(pointer, gripAt, board, 1, HANDS.lavender)
    expect(tapped.handLength).toBeLessThan(rest.handLength)
    expect(fingertip(tapped, 'lavender').y).toBeCloseTo(pointer.y)
  })
})

describe('getGripTargetX', () => {
  it('stays near the board at the far edges', () => {
    expect(getGripTargetX(1000, board)).toBe(1050)
    expect(getGripTargetX(-500, board)).toBe(150)
  })
})
