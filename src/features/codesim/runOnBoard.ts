import { commitCurrentPage, getCurrentPage } from '../engine/boardActions'
import { addShape } from '../engine/model/documentOps'
import { withRevealStep } from '../engine/model/revealSteps'
import type { Page, TextShape } from '../engine/model/types'
import { selectShapes, useSessionStore } from '../engine/sessionStore'
import { useCodeSimStore } from './codeSimStore'
import { runCode } from './run/runClient'

// Code reads best a little under the "S" text size: a 15-line solution
// still fits a 16:9 board next to its Variables panel.
const CARD_SCALE = 0.75
const CARD_AT = { x: 96, y: 150 }

export function findCodeCard(page: Page): TextShape | null {
  for (const id of page.order) {
    const shape = page.shapes[id]
    if (shape.type === 'text' && shape.codeCall !== undefined) return shape
  }
  return null
}

function newCard(source: string, call: string): TextShape {
  return {
    id: crypto.randomUUID(),
    type: 'text',
    ...CARD_AT,
    text: source,
    font: 'code',
    size: 's',
    scale: CARD_SCALE,
    color: 'black',
    opacity: 1,
    textAnimation: 'wipe',
    codeCall: call,
  }
}

// One card per page: running again rewrites it in place, so its spot and
// style survive edits made in the panel.
function placeCard(source: string, call: string): string {
  const existing = findCodeCard(getCurrentPage())
  const { presenting } = useSessionStore.getState()
  if (existing) {
    commitCurrentPage((page) => ({
      ...page,
      shapes: {
        ...page.shapes,
        [existing.id]: { ...existing, text: source, codeCall: call },
      },
    }))
    return existing.id
  }
  const card = newCard(source, call)
  commitCurrentPage((page) =>
    addShape(page, withRevealStep(page, card, presenting)),
  )
  selectShapes([card.id])
  return card.id
}

export async function runOnBoard(source: string, call: string): Promise<void> {
  const cardId = placeCard(source, call)
  useCodeSimStore.setState({
    status: 'loading',
    cardId,
    steps: [],
    index: 0,
    error: null,
    result: null,
  })
  try {
    const trace = await runCode(source, call, () =>
      useCodeSimStore.setState({ status: 'running' }),
    )
    useCodeSimStore.setState({
      status: trace.error ? 'error' : 'ready',
      steps: trace.steps,
      index: 0,
      error: trace.error,
      result: trace.result,
    })
  } catch (failure) {
    const message = failure instanceof Error ? failure.message : String(failure)
    useCodeSimStore.setState({
      status: 'error',
      error: { line: null, message },
    })
  }
}
