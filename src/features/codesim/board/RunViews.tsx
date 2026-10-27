import type { BoardPalette } from '../../engine/model/paper'
import { arrayHeight } from './arrayModel'
import { ArrayView } from './ArrayView'
import { CallStackPanel, OutputPanel, VariablesPanel } from './CodePanels'
import { panelHeight } from './panelLayout'
import type { RunLayout } from './useRunLayout'

// Variables, then the call stack, then output: the order a viewer's eye
// asks the questions "what is it now", "how did we get here", "what came out".
export function PanelColumn({
  run,
  y,
  palette,
}: {
  run: RunLayout
  y: number
  palette: BoardPalette
}) {
  const { m, width, columnX: x } = run
  const gap = m.pad * 2
  const stackY = y + run.vars.height + gap
  const stackH = run.stack ? panelHeight(m, run.stack.length) + gap : 0
  return (
    <>
      <VariablesPanel
        x={x}
        y={y}
        layout={{ ...run.vars, width }}
        step={run.step}
        stepIndex={run.index}
        m={m}
        palette={palette}
      />
      {run.stack && (
        <CallStackPanel
          x={x}
          y={stackY}
          width={width}
          rows={run.stack}
          m={m}
          palette={palette}
        />
      )}
      {run.output.length > 0 && (
        <OutputPanel
          x={x}
          y={stackY + stackH}
          width={width}
          lines={run.output}
          m={m}
          palette={palette}
        />
      )}
    </>
  )
}

export function ArraysBlock({
  run,
  x,
  palette,
}: {
  run: RunLayout
  x: number
  palette: BoardPalette
}) {
  const tops = run.arrays.map((_, i) =>
    run.arrays
      .slice(0, i)
      .reduce((y, model) => y + arrayHeight(model, run.geo), run.arraysY),
  )
  return (
    <>
      {run.arrays.map((model, i) => (
        <ArrayView
          key={model.name}
          model={model}
          x={x}
          y={tops[i]}
          geo={run.geo}
          palette={palette}
          stepIndex={run.index}
        />
      ))}
    </>
  )
}
