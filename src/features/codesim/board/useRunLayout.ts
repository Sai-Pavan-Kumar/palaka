import { useMemo } from 'react'
import { getFontPx, measureText } from '../../engine/model/textMetrics'
import type { TextShape } from '../../engine/model/types'
import { useCodeSimStore } from '../codeSimStore'
import { arrayGeometry, buildArrays } from './arrayModel'
import { placeDiagrams } from './diagramLayout'
import { buildGraph } from './graphModel'
import { buildLinked } from './linkedModel'
import {
  outputContent,
  panelMetrics,
  panelWidth,
  runHasNestedCalls,
  stackRows,
  variablesLayout,
} from './panelLayout'
import { changedNames } from './traceFormat'

// Room between the code card and what is drawn beside or below it.
const GAP = 64
const ARRAY_SCALE = 1.25

// Everything the board needs for the current step, in board units. Panels
// share one width so the right-hand column reads as a single tidy stack.
export function useRunLayout(card: TextShape) {
  const steps = useCodeSimStore((s) => s.steps)
  const index = useCodeSimStore((s) => s.index)
  const error = useCodeSimStore((s) => s.error)
  const result = useCodeSimStore((s) => s.result)
  const showStack = useMemo(() => runHasNestedCalls(steps), [steps])
  const step = steps[index]
  if (!step) return null

  const previous = steps[index - 1]
  const m = panelMetrics(getFontPx(card))
  const isLast = index === steps.length - 1
  const vars = variablesLayout(step, changedNames(previous, step), m)
  const stack = showStack ? stackRows(step) : null
  const output = outputContent(step, isLast, result, error)
  const texts = [...output, ...(stack ?? [])].map((row) => row.text)
  const cardSize = measureText(card)
  // Arrays are the star of DSA videos: drawn a size up from the panels.
  const geo = arrayGeometry(m.fontPx * ARRAY_SCALE)
  return {
    step,
    index,
    m,
    errorLine: isLast ? (error?.line ?? null) : null,
    vars,
    stack,
    output,
    width: Math.max(vars.width, panelWidth(texts, m)),
    columnX: card.x + cardSize.w + GAP,
    geo,
    diagrams: placeDiagrams(
      card.x,
      card.y + cardSize.h + GAP,
      geo,
      buildArrays(previous, step, card.codePins),
      buildLinked(step),
      buildGraph(step),
    ),
  }
}

export type RunLayout = NonNullable<ReturnType<typeof useRunLayout>>
