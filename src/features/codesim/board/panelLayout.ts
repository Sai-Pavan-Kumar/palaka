import { FONT_FAMILY, LINE_HEIGHT } from '../../engine/model/boardSpec'
import { measureLine } from '../../engine/model/textMetrics'
import type { PyValue, TraceError, TraceStep } from '../run/traceTypes'
import {
  clipValue,
  currentFrame,
  formatValue,
  outputLines,
} from './traceFormat'

const MIN_PANEL_WIDTH = 320
const MAX_OUTPUT_LINES = 6

// Shared look for the Variables and Output boxes: a calm card on the paper,
// a small grotesk title, rows in Geist Mono at the code card's size.
export type PanelMetrics = {
  fontPx: number
  rowH: number
  pad: number
  titleH: number
}

export function panelMetrics(codeFontPx: number): PanelMetrics {
  const fontPx = Math.round(codeFontPx * 0.9)
  return {
    fontPx,
    rowH: fontPx * LINE_HEIGHT,
    pad: Math.round(fontPx * 0.8),
    titleH: Math.round(fontPx * 1.9),
  }
}

export function codeFontCss(fontPx: number): string {
  return `400 ${fontPx}px ${FONT_FAMILY.code}`
}

export function textWidth(text: string, fontPx: number): number {
  return measureLine(text, codeFontCss(fontPx))
}

export function panelHeight(m: PanelMetrics, rows: number): number {
  return m.titleH + Math.max(rows, 1) * m.rowH + m.pad
}

export type Row = {
  key: string
  text: string
  flash: boolean
  isReturn?: boolean
}

function variableRows(step: TraceStep, changed: Set<string>): Row[] {
  const frame = currentFrame(step)
  const rows: Row[] = Object.entries(frame?.vars ?? {}).map(
    ([name, value]) => ({
      key: name,
      text: `${name} = ${clipValue(formatValue(value))}`,
      flash: changed.has(name),
    }),
  )
  if (step.event === 'return' && step.ret) {
    rows.push({
      key: '↩',
      text: `return ${clipValue(formatValue(step.ret))}`,
      flash: true,
      isReturn: true,
    })
  }
  return rows
}

export function panelWidth(lines: string[], m: PanelMetrics): number {
  const widest = Math.max(0, ...lines.map((l) => textWidth(l, m.fontPx)))
  return Math.max(MIN_PANEL_WIDTH, widest + m.pad * 2)
}

export function variablesLayout(
  step: TraceStep,
  changed: Set<string>,
  m: PanelMetrics,
) {
  const rows = variableRows(step, changed)
  const width = panelWidth(
    rows.map((r) => r.text),
    m,
  )
  return { rows, width, height: panelHeight(m, rows.length) }
}

export type OutputLine = { text: string; tone: 'plain' | 'result' | 'error' }

// The result and the error appear only on the last step: before that the
// program has not got there yet, and showing them early spoils the reveal.
export function outputContent(
  step: TraceStep,
  isLast: boolean,
  result: PyValue | null,
  error: TraceError | null,
): OutputLine[] {
  const lines: OutputLine[] = outputLines(step.stdout, MAX_OUTPUT_LINES).map(
    (text) => ({ text: clipValue(text), tone: 'plain' }),
  )
  if (isLast && result) {
    lines.push({ text: `→ ${clipValue(formatValue(result))}`, tone: 'result' })
  }
  if (isLast && error) {
    lines.push({ text: clipValue(error.message), tone: 'error' })
  }
  return lines
}
