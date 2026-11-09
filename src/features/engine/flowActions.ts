import { commitCurrentPage, getCurrentPage } from './boardActions'
import { getShapesInOrder } from './model/documentOps'
import { getHighestStep } from './model/revealSteps'
import type {
  FlowDirection,
  FlowSpeed,
  FlowStyle,
  LineShape,
  Page,
} from './model/types'
import { useSessionStore } from './sessionStore'

export function getSelectedLines(page: Page, selectedIds: string[]) {
  return getShapesInOrder(page, selectedIds).filter(
    (shape): shape is LineShape => shape.type === 'line',
  )
}

// An arrow's heads follow its flow, so the dots never run against the
// arrow. A plain line has no heads to turn and stays plain.
function headsFor(
  line: LineShape,
  direction: FlowDirection,
): Pick<LineShape, 'arrowhead' | 'arrowStart'> {
  if (!line.arrowhead && !line.arrowStart) return { arrowhead: false }
  return {
    arrowhead: direction !== 'backward',
    arrowStart: direction !== 'forward',
  }
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
        ...headsFor(line, direction),
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

// One click makes every selected arrow two-headed, or back to one head.
// Plain lines stay plain: a head is only added where one already was.
export function setTwoWay(isTwoWay: boolean): void {
  const { selectedIds } = useSessionStore.getState()
  const arrows = getSelectedLines(getCurrentPage(), selectedIds).filter(
    (line) => line.arrowhead || line.arrowStart,
  )
  if (arrows.length === 0) return
  commitCurrentPage((page) => {
    const shapes = { ...page.shapes }
    for (const line of arrows) {
      shapes[line.id] = { ...line, arrowhead: true, arrowStart: isTwoWay }
    }
    return { ...page, shapes }
  })
}
