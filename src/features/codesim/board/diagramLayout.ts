import { arrayHeight, type ArrayGeometry, type ArrayModel } from './arrayModel'
import {
  graphGeometry,
  type GraphGeometry,
  type GraphModel,
} from './graphModel'
import type { LinkedModel } from './linkedModel'
import { listGeometry } from './listGeometry'

const GAP = 64

export type PlacedDiagram =
  | { kind: 'array'; model: ArrayModel; x: number; y: number }
  | { kind: 'list'; model: LinkedModel; x: number; y: number }
  | {
      kind: 'graph'
      model: GraphModel
      g: GraphGeometry
      x: number
      y: number
    }

function arrayWidth(model: ArrayModel, geo: ArrayGeometry): number {
  const more = model.total > model.cells.length ? geo.fontPx * 5 : 0
  return model.cells.length * geo.cell + more
}

function listWidth(model: LinkedModel, geo: ArrayGeometry): number {
  return model.nodes.length * listGeometry(model, geo).pitch + geo.fontPx * 3
}

// Arrays and the list stack under the code card; the graph sits to their
// right, so a BFS shows its queue and its graph side by side.
export function placeDiagrams(
  x: number,
  y: number,
  geo: ArrayGeometry,
  arrays: ArrayModel[],
  linked: LinkedModel | null,
  graph: GraphModel | null,
): PlacedDiagram[] {
  const placed: PlacedDiagram[] = []
  let top = y
  let width = 0
  for (const model of arrays) {
    placed.push({ kind: 'array', model, x, y: top })
    top += arrayHeight(model, geo)
    width = Math.max(width, arrayWidth(model, geo))
  }
  if (linked) {
    placed.push({ kind: 'list', model: linked, x, y: top })
    width = Math.max(width, listWidth(linked, geo))
  }
  if (graph) {
    const g = graphGeometry(graph, geo.cell, geo.fontPx)
    const graphX = width > 0 ? x + width + GAP : x
    placed.push({ kind: 'graph', model: graph, g, x: graphX, y })
  }
  return placed
}
