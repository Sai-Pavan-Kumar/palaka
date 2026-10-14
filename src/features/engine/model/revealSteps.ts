import type { Page, Shape } from './types'

export function getHighestStep(page: Page): number {
  let highest = 0
  for (const id of page.order) {
    highest = Math.max(highest, page.shapes[id].revealStep ?? 0)
  }
  return highest
}

// New objects join the end of the reveal order while preparing. Objects drawn
// live during a talk get no step, so they never vanish on the next key press.
export function withRevealStep(
  page: Page,
  shape: Shape,
  presenting: boolean,
): Shape {
  const { revealStep: _previous, ...rest } = shape
  if (presenting) return rest as Shape
  return { ...rest, revealStep: getHighestStep(page) + 1 } as Shape
}

export function getSteppedShapes(page: Page): Shape[] {
  return page.order
    .map((id) => page.shapes[id])
    .filter((shape) => shape.revealStep !== undefined)
    .sort((a, b) => a.revealStep! - b.revealStep!)
}

// Deletes leave gaps (1, 2, 5); presenting needs 1..n so each key press shows
// exactly one object.
export function normalizeSteps(page: Page): Page {
  const changed = getSteppedShapes(page)
    .map((shape, index) => ({ shape, step: index + 1 }))
    .filter(({ shape, step }) => shape.revealStep !== step)
  if (changed.length === 0) return page
  const shapes = { ...page.shapes }
  for (const { shape, step } of changed) {
    shapes[shape.id] = { ...shape, revealStep: step }
  }
  return { ...page, shapes }
}
