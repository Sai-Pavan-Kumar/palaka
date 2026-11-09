import { beforeEach, describe, expect, it } from 'vitest'
import { getCurrentPage, insertShape } from './boardActions'
import { useEngineStore } from './engineStore'
import {
  getSelectedLines,
  setFlow,
  setFlowSpeed,
  setFlowStyle,
} from './flowActions'
import { createEmptyDocument } from './model/documentOps'
import type { LineShape } from './model/types'
import { selectShapes, setSession } from './sessionStore'

function makeLine(id: string): LineShape {
  return {
    id,
    type: 'line',
    x1: 50,
    y1: 50,
    x2: 250,
    y2: 50,
    arrowhead: true,
    color: 'black',
    opacity: 1,
    size: 'm',
    dash: 'clean',
  }
}

describe('flowActions', () => {
  beforeEach(() => {
    const doc = createEmptyDocument('16:9')
    useEngineStore.setState({ doc })
    setSession({ pageId: doc.pages[0].id, selectedIds: [] })
  })

  it('filters selected lines correctly', () => {
    const line = makeLine('line-1')
    insertShape(line)
    const page = getCurrentPage()
    expect(getSelectedLines(page, ['line-1'])).toHaveLength(1)
    expect(getSelectedLines(page, ['unknown-id'])).toHaveLength(0)
  })

  it('sets flow direction, speed, and style', () => {
    const line = makeLine('line-1')
    insertShape(line)
    selectShapes(['line-1'])

    // Turn flow on
    setFlow('forward')
    let current = getCurrentPage().shapes['line-1'] as LineShape
    expect(current.flow?.direction).toBe('forward')
    expect(current.flow?.speed).toBeUndefined() // defaults to normal in UI

    // Set speed to fast
    setFlowSpeed('fast')
    current = getCurrentPage().shapes['line-1'] as LineShape
    expect(current.flow?.speed).toBe('fast')

    // Set style to pulse
    setFlowStyle('pulse')
    current = getCurrentPage().shapes['line-1'] as LineShape
    expect(current.flow?.style).toBe('pulse')
    expect(current.flow?.speed).toBe('fast')
    expect(current.flow?.direction).toBe('forward')

    // Turn flow off
    setFlow(null)
    current = getCurrentPage().shapes['line-1'] as LineShape
    expect(current.flow).toBeUndefined()
  })

  it('turns the arrow heads to match the flow', () => {
    insertShape(makeLine('arrow'))
    selectShapes(['arrow'])
    const heads = () => {
      const line = getCurrentPage().shapes.arrow as LineShape
      return [!!line.arrowStart, line.arrowhead]
    }
    setFlow('both')
    expect(heads()).toEqual([true, true])
    setFlow('backward')
    expect(heads()).toEqual([true, false])
    setFlow('forward')
    expect(heads()).toEqual([false, true])
  })

  it('leaves a plain line without heads', () => {
    insertShape({ ...makeLine('plain'), arrowhead: false })
    selectShapes(['plain'])
    setFlow('both')
    const line = getCurrentPage().shapes.plain as LineShape
    expect([!!line.arrowStart, line.arrowhead]).toEqual([false, false])
  })
})
