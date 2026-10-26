import type { BoardPalette } from '../../engine/model/paper'
import type { TraceStep } from '../run/traceTypes'
import { BoardPanel } from './boardPanel'
import {
  codeFontCss,
  panelHeight,
  type OutputLine,
  type PanelMetrics,
  type Row,
  type variablesLayout,
} from './panelLayout'
import { currentFrame } from './traceFormat'

function RowText({
  row,
  index,
  m,
  width,
  palette,
  stepIndex,
}: {
  row: Row
  index: number
  m: PanelMetrics
  width: number
  palette: BoardPalette
  stepIndex: number
}) {
  const y = index * m.rowH
  return (
    <g>
      {row.flash && (
        // Keyed by step so the flash replays on every change, not just once.
        <rect
          key={`${row.key}-${stepIndex}`}
          className="codesim-flash"
          x={m.pad * 0.5}
          y={y}
          width={width - m.pad}
          height={m.rowH}
          rx={m.pad * 0.4}
          fill={palette.highlight.orange}
        />
      )}
      <text
        x={m.pad}
        y={y + m.rowH * 0.74}
        fill={row.isReturn ? palette.ink.blue : palette.ink.black}
        style={{ font: codeFontCss(m.fontPx) }}
      >
        {row.text}
      </text>
    </g>
  )
}

export function VariablesPanel({
  x,
  y,
  layout,
  step,
  stepIndex,
  m,
  palette,
}: {
  x: number
  y: number
  layout: ReturnType<typeof variablesLayout>
  step: TraceStep
  stepIndex: number
  m: PanelMetrics
  palette: BoardPalette
}) {
  const frame = currentFrame(step)
  const where = frame && frame.fn !== '<module>' ? `in ${frame.fn}()` : ''
  return (
    <BoardPanel
      x={x}
      y={y}
      width={layout.width}
      height={layout.height}
      title="Variables"
      subtitle={where}
      m={m}
      palette={palette}
    >
      {layout.rows.map((row, index) => (
        <RowText
          key={row.key}
          row={row}
          index={index}
          m={m}
          width={layout.width}
          palette={palette}
          stepIndex={stepIndex}
        />
      ))}
    </BoardPanel>
  )
}

export function OutputPanel({
  x,
  y,
  width,
  lines,
  m,
  palette,
}: {
  x: number
  y: number
  width: number
  lines: OutputLine[]
  m: PanelMetrics
  palette: BoardPalette
}) {
  const tone = {
    plain: palette.ink.black,
    result: palette.ink.blue,
    error: palette.ink.red,
  }
  return (
    <BoardPanel
      x={x}
      y={y}
      width={width}
      height={panelHeight(m, lines.length)}
      title="Output"
      m={m}
      palette={palette}
    >
      {lines.map((line, index) => (
        <text
          key={index}
          x={m.pad}
          y={index * m.rowH + m.rowH * 0.74}
          fill={tone[line.tone]}
          style={{ font: codeFontCss(m.fontPx) }}
        >
          {line.text}
        </text>
      ))}
    </BoardPanel>
  )
}
