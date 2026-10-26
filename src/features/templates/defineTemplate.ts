import type { BlockKind } from '../engine/model/types'
import type {
  DiagramTemplate,
  TemplateNode,
  TemplateStep,
} from './diagramTemplates'

type NodeExtras = Pick<TemplateNode, 'label' | 'icon' | 'sim'>

// [key, kind, column, row, extras?]: one line per block keeps a 30-template
// catalog readable at a glance.
export type NodeSpec = [
  key: string,
  kind: BlockKind,
  col: number,
  row: number,
  extras?: NodeExtras,
]

export type EdgeSpec = [from: string, to: string]

// Reveal order follows the drawing: each block appears right after the
// arrow that leads into it, so Present tells the story request by request.
function orderSteps(nodes: TemplateNode[], edges: EdgeSpec[]): TemplateStep[] {
  const placed = new Set<string>()
  const used = new Set<EdgeSpec>()
  const steps: TemplateStep[] = []
  for (const node of nodes) {
    for (const edge of edges) {
      if (used.has(edge)) continue
      const [from, to] = edge
      const joinsPlaced = placed.has(from) || placed.has(to)
      if (joinsPlaced && (to === node.key || from === node.key)) {
        steps.push({ edge })
        used.add(edge)
      }
    }
    steps.push({ node })
    placed.add(node.key)
  }
  for (const edge of edges) if (!used.has(edge)) steps.push({ edge })
  return steps
}

export function defineTemplate(
  category: string,
  id: string,
  name: string,
  teaches: string,
  nodeSpecs: NodeSpec[],
  edges: EdgeSpec[],
): DiagramTemplate {
  const nodes = nodeSpecs.map(([key, kind, col, row, extras]) => ({
    key,
    kind,
    at: [col, row] as [number, number],
    ...extras,
  }))
  return { id, category, name, teaches, steps: orderSteps(nodes, edges) }
}
