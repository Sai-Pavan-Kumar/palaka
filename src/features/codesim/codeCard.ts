import { commitCurrentPage, getCurrentPage } from '../engine/boardActions'
import { useEngineStore } from '../engine/engineStore'
import { addShape } from '../engine/model/documentOps'
import { fitTextToBoard, textAreaFor } from '../engine/model/textFit'
import { withRevealStep } from '../engine/model/revealSteps'
import type { CodePins, Page, TextShape } from '../engine/model/types'
import { selectShapes, useSessionStore } from '../engine/sessionStore'

// Code reads best a little under the "S" text size: a 15-line solution
// still fits a 16:9 board next to its Variables panel.
const CARD_SCALE = 0.75
const CARD_AT = { x: 96, y: 150 }

export const NO_PINS: CodePins = { arrays: [], pointers: [] }

export function findCodeCard(page: Page): TextShape | null {
  for (const id of page.order) {
    const shape = page.shapes[id]
    if (shape.type === 'text' && shape.codeCall !== undefined) return shape
  }
  return null
}

// Identifies what a run was computed from, so a run made before the code
// was edited is never stepped through as if it were current.
export function runKeyOf(source: string, call: string): string {
  return `${source}\n#run ${call}`
}

function newCard(source: string, call: string, pins: CodePins): TextShape {
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
    codePins: pins,
  }
}

// A long program shrinks to stay on the board (it never wraps: the line
// band needs every source line on its own row).
function fitCard(card: TextShape): TextShape {
  const { aspect } = useEngineStore.getState().doc
  const frames = getCurrentPage().frameCount ?? 1
  return fitTextToBoard(card, textAreaFor(card.x, aspect, frames))
}

function patchCard(card: TextShape, patch: Partial<TextShape>): void {
  const next = fitCard({ ...card, ...patch })
  commitCurrentPage((page) => ({
    ...page,
    shapes: { ...page.shapes, [card.id]: next },
  }))
}

// One card per page: running again rewrites it in place, so its spot,
// style and present setting survive edits made in the panel.
export function placeCard(
  source: string,
  call: string,
  pins: CodePins,
): string {
  const existing = findCodeCard(getCurrentPage())
  if (existing) {
    patchCard(existing, { text: source, codeCall: call, codePins: pins })
    return existing.id
  }
  const card = fitCard(newCard(source, call, pins))
  const { presenting } = useSessionStore.getState()
  commitCurrentPage((page) =>
    addShape(page, withRevealStep(page, card, presenting)),
  )
  selectShapes([card.id])
  return card.id
}

export function setCodeStepThrough(on: boolean): void {
  const card = findCodeCard(getCurrentPage())
  if (card) patchCard(card, { codeStepThrough: on })
}
