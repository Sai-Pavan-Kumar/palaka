import type { BoardPalette } from '../../engine/model/paper'
import { ArrayView } from './ArrayView'
import type { PlacedDiagram } from './diagramLayout'
import { GraphView } from './GraphView'
import { LinkedListView } from './LinkedListView'
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

function Diagram({
  item,
  run,
  palette,
}: {
  item: PlacedDiagram
  run: RunLayout
  palette: BoardPalette
}) {
  const common = { x: item.x, y: item.y, geo: run.geo, palette }
  if (item.kind === 'array') {
    return <ArrayView model={item.model} stepIndex={run.index} {...common} />
  }
  if (item.kind === 'list')
    return <LinkedListView model={item.model} {...common} />
  return <GraphView model={item.model} g={item.g} {...common} />
}

export function DiagramsBlock({
  run,
  palette,
}: {
  run: RunLayout
  palette: BoardPalette
}) {
  return run.diagrams.map((item) => (
    <Diagram
      key={`${item.kind}:${'name' in item.model ? item.model.name : 'list'}`}
      item={item}
      run={run}
      palette={palette}
    />
  ))
}
