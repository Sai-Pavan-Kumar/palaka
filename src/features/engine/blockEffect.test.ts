import { beforeEach, describe, expect, it } from 'vitest'
import { applyStyle, getCurrentPage, insertShape } from './boardActions'
import { useEngineStore } from './engineStore'
import { createBlock } from './model/shapeFactory'
import { createEmptyDocument } from './model/documentOps'
import type { BlockShape } from './model/types'
import { selectShapes, setSession } from './sessionStore'

describe('blockEffect', () => {
  beforeEach(() => {
    const doc = createEmptyDocument('16:9')
    useEngineStore.setState({ doc })
    setSession({ pageId: doc.pages[0].id, selectedIds: [] })
  })

  it('creates block with default effect none', () => {
    const block = createBlock('server' as any, { x: 100, y: 100, w: 120, h: 80 }, {
      color: 'black',
      size: 'm',
      fill: 'none',
      dash: 'clean',
      font: 'brand',
      opacity: 1,
    })
    expect(block.effect).toBe('none')
  })

  it('patches block effect via applyStyle', () => {
    const block = createBlock('service', { x: 100, y: 100, w: 120, h: 80 }, {
      color: 'black',
      size: 'm',
      fill: 'none',
      dash: 'clean',
      font: 'brand',
      opacity: 1,
    })
    insertShape(block)
    selectShapes([block.id])

    // Apply glow
    applyStyle({ effect: 'glow' })
    let current = getCurrentPage().shapes[block.id] as BlockShape
    expect(current.effect).toBe('glow')

    // Apply meteorite
    applyStyle({ effect: 'meteorite' })
    current = getCurrentPage().shapes[block.id] as BlockShape
    expect(current.effect).toBe('meteorite')

    // Apply dash
    applyStyle({ effect: 'dash' })
    current = getCurrentPage().shapes[block.id] as BlockShape
    expect(current.effect).toBe('dash')

    // Turn off
    applyStyle({ effect: 'none' })
    current = getCurrentPage().shapes[block.id] as BlockShape
    expect(current.effect).toBe('none')
  })
})
