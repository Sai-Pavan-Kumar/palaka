import { describe, expect, it } from 'vitest'
import { addShape, createEmptyDocument } from '../engine/model/documentOps'
import { createStroke } from '../engine/model/shapeFactory'
import { useSessionStore } from '../engine/sessionStore'
import type { BoardDocument } from '../engine/model/types'
import { countShapesOutside } from './pageActions'

function boardWithStrokeAt(x: number): BoardDocument {
  const doc = createEmptyDocument('16:9')
  const { style } = useSessionStore.getState()
  const stroke = createStroke('pen', [x, 100, 0.5], false, style)
  const page = addShape(doc.pages[0], stroke)
  return { ...doc, pages: [page] }
}

describe('countShapesOutside', () => {
  it('counts a shape past the narrower portrait board', () => {
    expect(countShapesOutside(boardWithStrokeAt(1500), '9:16')).toBe(1)
  })

  it('ignores a shape that still fits', () => {
    expect(countShapesOutside(boardWithStrokeAt(200), '9:16')).toBe(0)
  })
})
