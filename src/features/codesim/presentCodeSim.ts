import { useEffect } from 'react'
import { isShownAt } from '../animate/motion'
import { getCurrentPage } from '../engine/boardActions'
import { useEngineStore } from '../engine/engineStore'
import { findPage } from '../engine/model/documentOps'
import type { Page, TextShape } from '../engine/model/types'
import { useSessionStore } from '../engine/sessionStore'
import { findCodeCard, runKeyOf } from './codeCard'
import { stepCodeSim, useCodeSimStore } from './codeSimStore'
import { prepareCodeRun } from './runOnBoard'

type Session = ReturnType<typeof useSessionStore.getState>

// While presenting, a code card is a plain reveal object unless its switch
// is on. When on and on screen, its run "owns" Space until the last line.
function armedCardIn(page: Page | null | undefined, session: Session) {
  if (!session.presenting || !page) return null
  const card = findCodeCard(page)
  if (!card?.codeStepThrough) return null
  const shown = session.revealedUpTo[session.pageId] ?? 0
  return isShownAt(card, shown, null) ? card : null
}

function isRunFor(card: TextShape): boolean {
  const run = useCodeSimStore.getState()
  return (
    run.cardId === card.id &&
    run.runKey === runKeyOf(card.text, card.codeCall ?? '')
  )
}

// Returns true when the code took the key; false hands it to the reveal,
// so after the last line the same Space simply moves to the next object.
export function handlePresentCodeKey(direction: 1 | -1): boolean {
  const card = armedCardIn(getCurrentPage(), useSessionStore.getState())
  if (!card || !isRunFor(card)) return false
  const run = useCodeSimStore.getState()
  // Python still warming up: hold the key rather than skip the code.
  if (run.status === 'loading' || run.status === 'running') return true
  const canMove =
    direction === 1 ? run.index < run.steps.length - 1 : run.index > 0
  if (canMove) stepCodeSim(direction)
  return canMove
}

// In presenting, the overlay belongs only to a switched-on card whose run
// matches its code; a plain card shows just its text.
export function showsRunWhilePresenting(card: TextShape): boolean {
  return card.codeStepThrough === true && isRunFor(card)
}

// Runs every switched-on card's code as soon as presenting starts (and on
// each page change), long before Space reaches it.
export function usePresentPrewarm(page: Page): void {
  const presenting = useSessionStore((s) => s.presenting)
  const card = findCodeCard(page)
  const wants = presenting && card?.codeStepThrough === true
  // Safe to repeat: a run that already matches the card only rewinds.
  // Shapes are immutable, so a new card object means the card changed.
  useEffect(() => {
    if (wants && card) prepareCodeRun(card)
  }, [wants, card])
}

// "code 7 / 29" for the speaker's step counter, while a run owns Space.
export function useArmedCodeCount(): { index: number; total: number } | null {
  const session = useSessionStore()
  const page = useEngineStore((s) => findPage(s.doc, session.pageId))
  const index = useCodeSimStore((s) => s.index)
  const total = useCodeSimStore((s) => s.steps.length)
  useCodeSimStore((s) => s.runKey)
  const card = armedCardIn(page, session)
  if (!card || !isRunFor(card) || total === 0) return null
  return { index, total }
}
