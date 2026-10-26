import { getPalette, type BoardPalette } from '../../engine/model/paper'
import { getFontPx, measureText } from '../../engine/model/textMetrics'
import { LINE_HEIGHT } from '../../engine/model/boardSpec'
import type { Page, Paper, Shape, TextShape } from '../../engine/model/types'
import { useCodeSimStore } from '../codeSimStore'
import { OutputPanel, VariablesPanel } from './CodePanels'
import {
  outputContent,
  panelMetrics,
  panelWidth,
  variablesLayout,
} from './panelLayout'
import { changedNames } from './traceFormat'
import './codesim.css'

// Room between the code card and the panels, in board units.
const PANEL_GAP = 64

function LineBand({
  card,
  line,
  tone,
  palette,
}: {
  card: TextShape
  line: number
  tone: 'run' | 'error'
  palette: BoardPalette
}) {
  const lineH = getFontPx(card) * LINE_HEIGHT
  const { w } = measureText(card)
  const pad = lineH * 0.35
  const color = tone === 'error' ? palette.ink.red : palette.ink.blue
  return (
    // The band glides between lines (CSS transform), so the eye can follow
    // a jump back to a loop head instead of losing the line.
    <g
      className="codesim-band"
      style={{ transform: `translate(0px, ${(line - 1) * lineH}px)` }}
    >
      <rect
        x={card.x - pad}
        y={card.y}
        width={w + pad * 2}
        height={lineH}
        rx={lineH * 0.18}
        fill={color}
        fillOpacity={0.12}
      />
      <rect
        x={card.x - pad}
        y={card.y}
        width={lineH * 0.12}
        height={lineH}
        rx={lineH * 0.06}
        fill={color}
      />
    </g>
  )
}

function useRunLayout(card: TextShape) {
  const steps = useCodeSimStore((s) => s.steps)
  const index = useCodeSimStore((s) => s.index)
  const error = useCodeSimStore((s) => s.error)
  const result = useCodeSimStore((s) => s.result)
  const step = steps[index]
  if (!step) return null
  const m = panelMetrics(getFontPx(card))
  const isLast = index === steps.length - 1
  const errorLine = isLast ? (error?.line ?? null) : null
  const vars = variablesLayout(step, changedNames(steps[index - 1], step), m)
  const output = outputContent(step, isLast, result, error)
  const outputTexts = output.map((line) => line.text)
  return {
    step,
    index,
    m,
    errorLine,
    vars,
    output,
    x: card.x + measureText(card).w + PANEL_GAP,
    width: Math.max(vars.width, panelWidth(outputTexts, m)),
  }
}

function CodeSimRun({ card, paper }: { card: TextShape; paper: Paper }) {
  const run = useRunLayout(card)
  if (!run) return null
  const { step, index, m, errorLine, vars, output, x, width } = run
  const palette = getPalette(paper)

  return (
    <g className="codesim-layer" pointerEvents="none">
      <LineBand
        card={card}
        line={errorLine ?? step.line}
        tone={errorLine !== null ? 'error' : 'run'}
        palette={palette}
      />
      <VariablesPanel
        x={x}
        y={card.y}
        layout={{ ...vars, width }}
        step={step}
        stepIndex={index}
        m={m}
        palette={palette}
      />
      {output.length > 0 && (
        <OutputPanel
          x={x}
          y={card.y + vars.height + m.pad * 2}
          width={width}
          lines={output}
          m={m}
          palette={palette}
        />
      )}
    </g>
  )
}

// Lives in the recorded board next to SimLayer: takes capture the stepping,
// exports draw only the document (the card's code, never a run).
export function CodeSimLayer({
  page,
  paper,
  isVisible = () => true,
}: {
  page: Page
  paper: Paper
  isVisible?: (shape: Shape) => boolean
}) {
  const cardId = useCodeSimStore((s) => s.cardId)
  const card = cardId ? page.shapes[cardId] : undefined
  if (!card || card.type !== 'text' || !isVisible(card)) return null
  return <CodeSimRun card={card} paper={paper} />
}
