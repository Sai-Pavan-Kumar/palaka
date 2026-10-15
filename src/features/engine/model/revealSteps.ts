import type { Page, Shape } from './types'

// A reveal step either shows a shape or starts the flow dots on a
// connector. Both live in one numbered sequence, so Space walks through
// "arrow appears" and "data starts moving" in whatever order was set.
export type StepKind = 'shape' | 'flow'

export type StepItem = { shape: Shape; kind: StepKind; step: number }

export function getStepOf(shape: Shape, kind: StepKind): number | undefined {
  if (kind === 'shape') return shape.revealStep
  return shape.type === 'line' ? shape.flow?.step : undefined
}

export function withStep(
  shape: Shape,
  kind: StepKind,
  step: number | undefined,
): Shape {
  if (kind === 'flow') {
    if (shape.type !== 'line' || !shape.flow) return shape
    const { step: _old, ...flow } = shape.flow
    return {
      ...shape,
      flow: step === undefined ? flow : { ...flow, step },
    }
  }
  const { revealStep: _previous, ...rest } = shape
  return (step === undefined ? rest : { ...rest, revealStep: step }) as Shape
}

export function getStepItems(page: Page): StepItem[] {
  const items: StepItem[] = []
  for (const id of page.order) {
    const shape = page.shapes[id]
    for (const kind of ['shape', 'flow'] as const) {
      const step = getStepOf(shape, kind)
      if (step !== undefined) items.push({ shape, kind, step })
    }
  }
  return items.sort((a, b) => a.step - b.step)
}

export function getHighestStep(page: Page): number {
  const items = getStepItems(page)
  return items.length > 0 ? items[items.length - 1].step : 0
}

// New objects join the end of the reveal order while preparing. Objects drawn
// live during a talk get no step, so they never vanish on the next key press.
export function withRevealStep(
  page: Page,
  shape: Shape,
  presenting: boolean,
): Shape {
  return withStep(
    shape,
    'shape',
    presenting ? undefined : getHighestStep(page) + 1,
  )
}

// Deletes leave gaps (1, 2, 5); presenting needs 1..n so each key press does
// exactly one thing.
export function normalizeSteps(page: Page): Page {
  const changed = getStepItems(page)
    .map((item, index) => ({ ...item, next: index + 1 }))
    .filter((item) => item.step !== item.next)
  if (changed.length === 0) return page
  const shapes = { ...page.shapes }
  for (const { shape, kind, next } of changed) {
    shapes[shape.id] = withStep(shapes[shape.id], kind, next)
  }
  return { ...page, shapes }
}
