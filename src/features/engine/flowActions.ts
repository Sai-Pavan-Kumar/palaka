import { commitCurrentPage, getCurrentPage } from './boardActions'
import { getShapesInOrder } from './model/documentOps'
import { getHighestStep } from './model/revealSteps'
import type { FlowDirection, FlowSpeed, FlowStyle, LineShape, Page } from './model/types'
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

export function setFlowSpeed(speed: FlowSpeed): void {
  const { selectedIds } = useSessionStore.getState()
  const lines = getSelectedLines(getCurrentPage(), selectedIds)
  if (lines.length === 0) return
  commitCurrentPage((page) => {
    const shapes = { ...page.shapes }
    for (const line of lines) {
      if (!line.flow) continue
      shapes[line.id] = { ...line, flow: { ...line.flow, speed } }
    }
    return { ...page, shapes }
  })
}

export function setFlowStyle(style: FlowStyle): void {
  const { selectedIds } = useSessionStore.getState()
  const lines = getSelectedLines(getCurrentPage(), selectedIds)
  if (lines.length === 0) return
  commitCurrentPage((page) => {
    const shapes = { ...page.shapes }
    for (const line of lines) {
      if (!line.flow) continue
      shapes[line.id] = { ...line, flow: { ...line.flow, style } }
    }
    return { ...page, shapes }
  })
}
