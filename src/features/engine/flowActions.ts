import { commitCurrentPage, getCurrentPage } from './boardActions'
import { getShapesInOrder } from './model/documentOps'
import { getHighestStep } from './model/revealSteps'
import type { FlowDirection, LineShape, Page } from './model/types'
import { useSessionStore } from './sessionStore'

export function getSelectedLines(page: Page, selectedIds: string[]) {
  return getShapesInOrder(page, selectedIds).filter(
    (shape): shape is LineShape => shape.type === 'line',
  )
}

// Turning flow on while preparing makes "dots start" the next reveal step,
// so the default story is: arrow appears, Space, data moves. Changing the
// direction of a flow that exists keeps its step.
export function setFlow(direction: FlowDirection | null): void {
  const { selectedIds, presenting } = useSessionStore.getState()
  const lines = getSelectedLines(getCurrentPage(), selectedIds)
  if (lines.length === 0) return
  commitCurrentPage((page) => {
    const shapes = { ...page.shapes }
    let nextStep = getHighestStep(page) + 1
    for (const line of lines) {
      const { flow, ...rest } = line
      if (direction === null) {
        shapes[line.id] = rest
        continue
      }
      const step = flow ? flow.step : presenting ? undefined : nextStep++
      shapes[line.id] = {
        ...rest,
        flow: step === undefined ? { direction } : { direction, step },
      }
    }
    return { ...page, shapes }
  })
}
