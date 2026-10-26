import { describe, expect, it } from 'vitest'
import type { Page, Shape } from '../engine/model/types'
import { getQueryFocus } from './queryFocus'

const card = {
  id: 'card',
  type: 'text',
  x: 0,
  y: 0,
  text: 'SELECT name\nFROM users\nWHERE age > 30\nORDER BY name',
  font: 'code',
  size: 's',
  scale: 1,
  color: 'black',
  opacity: 1,
  fromQuery: 'q1:card',
  revealStep: 1,
} as Shape

function stage(id: string, label: string, step: number): Shape {
  return {
    id,
    type: 'tableState',
    tableId: 't',
    label,
    rows: [],
    color: 'black',
    opacity: 1,
    fromQuery: `q1:${id}`,
    revealStep: step,
  } as Shape
}

const result = {
  ...stage('result', '', 4),
  type: 'table',
  fromQuery: 'q1:result',
} as unknown as Shape

const page: Page = {
  id: 'p',
  name: 'P',
  shapes: {
    card,
    s0: stage('s0', 'WHERE age > 30', 2),
    s1: stage('s1', 'ORDER BY name', 3),
    result,
  },
  order: ['card', 's0', 's1', 'result'],
}

describe('getQueryFocus', () => {
  it('walks FROM, each clause, then SELECT', () => {
    expect(getQueryFocus(page, 0).size).toBe(0)
    expect(getQueryFocus(page, 1).get('card')).toBe(1)
    expect(getQueryFocus(page, 2).get('card')).toBe(2)
    expect(getQueryFocus(page, 3).get('card')).toBe(3)
    expect(getQueryFocus(page, 4).get('card')).toBe(0)
  })

  it('stays off while editing', () => {
    expect(getQueryFocus(page, null).size).toBe(0)
  })
})
