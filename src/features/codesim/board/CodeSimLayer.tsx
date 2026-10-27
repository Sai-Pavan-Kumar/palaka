import { getPalette, type BoardPalette } from '../../engine/model/paper'
import { getFontPx, measureText } from '../../engine/model/textMetrics'
import { LINE_HEIGHT } from '../../engine/model/boardSpec'
import type { Page, Paper, Shape, TextShape } from '../../engine/model/types'
import { useSessionStore } from '../../engine/sessionStore'
import { useCodeSimStore } from '../codeSimStore'
import { showsRunWhilePresenting, usePresentPrewarm } from '../presentCodeSim'
import { DiagramsBlock, PanelColumn } from './RunViews'
import { useRunLayout } from './useRunLayout'
import './codesim.css'

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

function CodeSimRun({ card, paper }: { card: TextShape; paper: Paper }) {
  const run = useRunLayout(card)
  if (!run) return null
  const palette = getPalette(paper)
  return (
    <g className="codesim-layer" pointerEvents="none">
      <LineBand
        card={card}
        line={run.errorLine ?? run.step.line}
        tone={run.errorLine !== null ? 'error' : 'run'}
        palette={palette}
      />
      <PanelColumn run={run} y={card.y} palette={palette} />
      <DiagramsBlock run={run} palette={palette} />
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
  usePresentPrewarm(page)
  const presenting = useSessionStore((s) => s.presenting)
  const cardId = useCodeSimStore((s) => s.cardId)
  useCodeSimStore((s) => s.runKey)
  const card = cardId ? page.shapes[cardId] : undefined
  if (!card || card.type !== 'text' || !isVisible(card)) return null
  if (presenting && !showsRunWhilePresenting(card)) return null
  return <CodeSimRun card={card} paper={paper} />
}
