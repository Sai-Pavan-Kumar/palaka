import type { Shape } from './types'

// Effects are reveal steps with no ink of their own (highlights, query
// clauses). They are never drawn, grabbed, erased or selected directly.
export function isEffect(shape: Shape): boolean {
  return shape.type === 'highlight' || shape.type === 'tableState'
}
