import { beforeEach, describe, expect, it } from 'vitest'
import {
  copySelected,
  deleteSelected,
  duplicateSelected,
  getCurrentPage,
  insertShape,
  pasteClipboard,
  toggleLockSelected,
} from './boardActions'
import { useEngineStore } from './engineStore'
import { createEmptyDocument } from './model/documentOps'
import type { GeoShape } from './model/types'
import { selectShapes, setSession, useSessionStore } from './sessionStore'

function makeBox(id: string, x = 100, y = 100): GeoShape {
  return {
    id,
    type: 'geo',
    geo: 'rectangle',
    x,
    y,
    w: 120,
    h: 80,
    color: 'black',
    opacity: 1,
    size: 'm',
    fill: 'none',
    dash: 'clean',
  }
}

describe('boardActions - clipboard and lock', () => {
  beforeEach(() => {
    const doc = createEmptyDocument('16:9')
    useEngineStore.setState({ doc })
    setSession({ pageId: doc.pages[0].id, selectedIds: [] })
  })

  it('toggles lock on selected shapes', () => {
    const box = makeBox('box-1')
    insertShape(box)
    selectShapes(['box-1'])

    toggleLockSelected()
    expect(getCurrentPage().shapes['box-1'].locked).toBe(true)

    toggleLockSelected()
    expect(getCurrentPage().shapes['box-1'].locked).toBe(false)
  })

  it('protects locked shapes from being deleted', () => {
    const box1 = makeBox('box-1')
    const box2 = makeBox('box-2', 250, 100)
    insertShape(box1)
    insertShape(box2)

    selectShapes(['box-1'])
    toggleLockSelected()

    selectShapes(['box-1', 'box-2'])
    deleteSelected()

    const page = getCurrentPage()
    expect(page.shapes['box-1']).toBeDefined()
    expect(page.shapes['box-2']).toBeUndefined()
    expect(useSessionStore.getState().selectedIds).toEqual(['box-1'])
  })

  it('copies and pastes shapes with new IDs and offset', () => {
    const box = makeBox('box-1', 100, 100)
    insertShape(box)
    selectShapes(['box-1'])

    copySelected()
    pasteClipboard()

    const page = getCurrentPage()
    expect(page.order).toHaveLength(2)

    const pastedId = useSessionStore.getState().selectedIds[0]
    expect(pastedId).not.toBe('box-1')

    const pasted = page.shapes[pastedId] as GeoShape
    expect(pasted.x).toBe(132)
    expect(pasted.y).toBe(132)
    expect(pasted.locked).toBe(false)
  })

  it('allocates next revealStep on duplicate when not presenting', () => {
    const box = { ...makeBox('box-1', 100, 100), revealStep: 1 }
    insertShape(box)
    selectShapes(['box-1'])

    useSessionStore.setState({ presenting: false })
    duplicateSelected()

    const page = getCurrentPage()
    const dupId = useSessionStore.getState().selectedIds[0]
    expect(page.shapes['box-1'].revealStep).toBe(1)
    expect(page.shapes[dupId].revealStep).toBe(2)
  })

  it('clears revealStep on duplicate and paste when presenting', () => {
    const box = { ...makeBox('box-1', 100, 100), revealStep: 3 }
    insertShape(box)
    selectShapes(['box-1'])

    useSessionStore.setState({ presenting: true })
    duplicateSelected()

    const page = getCurrentPage()
    const dupId = useSessionStore.getState().selectedIds[0]
    expect(page.shapes[dupId].revealStep).toBeUndefined()

    selectShapes(['box-1'])
    copySelected()
    pasteClipboard()

    const pastedId = useSessionStore.getState().selectedIds[0]
    expect(getCurrentPage().shapes[pastedId].revealStep).toBeUndefined()
  })
})
