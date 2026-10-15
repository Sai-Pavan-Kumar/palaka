import { describe, expect, it } from 'vitest'
import { pruneOrphanedShapes } from './pruneShapes'
import type { HighlightShape, Page, TableShape, TableStateShape } from './types'

describe('pruneOrphanedShapes', () => {
  const table: TableShape = {
    id: 't-users',
    type: 'table',
    x: 100,
    y: 100,
    scale: 1,
    name: 'users',
    columns: [
      { name: 'id', type: 'int', pk: true, notNull: true, unique: true },
    ],
    rows: [['1']],
    color: 'black',
    opacity: 1,
    size: 'm',
    fill: 'tint',
    dash: 'clean',
  }

  const state: TableStateShape = {
    id: 's-state',
    type: 'tableState',
    tableId: 't-users',
    label: 'UPDATE users SET id = 1',
    rows: [],
    color: 'black',
    opacity: 1,
    fromQuery: 'm1:s0',
  }

  const highlight: HighlightShape = {
    id: 'h-light',
    type: 'highlight',
    targets: [{ tableId: 't-users', column: 'id' }],
    color: 'black',
    opacity: 1,
  }

  it('cascades deletion of table to tableState and highlight shapes', () => {
    const page: Page = {
      id: 'p1',
      name: 'Page 1',
      shapes: {
        [table.id]: table,
        [state.id]: state,
        [highlight.id]: highlight,
      },
      order: [table.id, state.id, highlight.id],
    }

    const pruned = pruneOrphanedShapes(page, new Set([table.id]))
    expect(pruned.shapes).toEqual({})
    expect(pruned.order).toEqual([])
  })

  it('clears all effect shapes when no tangible shapes remain on the page', () => {
    const page: Page = {
      id: 'p1',
      name: 'Page 1',
      shapes: {
        [state.id]: state,
        [highlight.id]: highlight,
      },
      order: [state.id, highlight.id],
    }

    const pruned = pruneOrphanedShapes(page, new Set())
    expect(pruned.shapes).toEqual({})
    expect(pruned.order).toEqual([])
  })
})
