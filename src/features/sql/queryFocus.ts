import { getTextLines } from '../engine/model/textMetrics'
import type { Page } from '../engine/model/types'

// The clause word a card line or a stage label starts with. Multi-word
// keywords come first so "GROUP BY" never matches as just "GROUP".
const CLAUSE =
  /^(GROUP BY|ORDER BY|(?:(?:INNER|LEFT|RIGHT|FULL)(?:\s+OUTER)?\s+)?JOIN|WHERE|LIMIT|FROM|SELECT)\b/i

function clauseOf(text: string): string | null {
  const match = text.trim().match(CLAUSE)
  return match ? match[1].toUpperCase().replace(/\s+/g, ' ') : null
}

function lineOf(cardText: string, clause: string): number | null {
  const index = getTextLines(cardText).findIndex(
    (line) => clauseOf(line) === clause,
  )
  return index === -1 ? null : index
}

function isShown(step: number | undefined, upTo: number): boolean {
  return step === undefined || step <= upTo
}

// Which line of each query card is "running" after `shownUpTo` steps, in the
// order a database really works: FROM first, then each clause step as it is
// revealed, SELECT last once the result table appears. Teaching that order
// is half the point of animating a query.
export function getQueryFocus(
  page: Page,
  shownUpTo: number | null,
): Map<string, number> {
  const focus = new Map<string, number>()
  if (shownUpTo === null) return focus
  for (const id of page.order) {
    const card = page.shapes[id]
    if (card.type !== 'text' || !card.fromQuery?.endsWith(':card')) continue
    if (!isShown(card.revealStep, shownUpTo)) continue
    const key = card.fromQuery.slice(0, -':card'.length)
    let clause = 'FROM'
    let latest = -1
    for (const otherId of page.order) {
      const shape = page.shapes[otherId]
      if (!shape.fromQuery?.startsWith(`${key}:`) || shape === card) continue
      const step = shape.revealStep ?? 0
      if (!isShown(shape.revealStep, shownUpTo) || step < latest) continue
      const next =
        shape.type === 'tableState'
          ? clauseOf(shape.label)
          : shape.fromQuery.endsWith(':result')
            ? 'SELECT'
            : null
      if (next) {
        clause = next
        latest = step
      }
    }
    const line = lineOf(card.text, clause)
    if (line !== null) focus.set(card.id, line)
  }
  return focus
}
