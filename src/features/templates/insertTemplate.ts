import { commitCurrentPage } from '../engine/boardActions'
import { useEngineStore } from '../engine/engineStore'
import { SLIDE_SIZE } from '../engine/model/boardSpec'
import { rerouteConnectors } from '../engine/model/connectors'
import { addShape } from '../engine/model/documentOps'
import { getHighestStep } from '../engine/model/revealSteps'
import { createBlock, createLine } from '../engine/model/shapeFactory'
import type { BlockShape, Page, Shape } from '../engine/model/types'
import { selectShapes, setTool, useSessionStore } from '../engine/sessionStore'
import type { DiagramTemplate, TemplateNode } from './diagramTemplates'

const BLOCK_W = 200
const BLOCK_H = 120
const COL_GAP = 420
const ROW_GAP = 260
// Keeps the diagram off the slide edge and clear of the brand mark.
const MARGIN = 80

// Columns squeeze on a narrow 9:16 slide so the whole flow still fits.
function layout(template: DiagramTemplate, aspect: '16:9' | '9:16') {
  const nodes = template.steps.flatMap((s) => ('node' in s ? [s.node] : []))
  const cols = Math.max(...nodes.map((n) => n.at[0]))
  const rows = Math.max(...nodes.map((n) => n.at[1]))
  const { width, height } = SLIDE_SIZE[aspect]
  const colGap = Math.min(COL_GAP, (width - BLOCK_W - MARGIN * 2) / (cols || 1))
  const left = (width - (cols * colGap + BLOCK_W)) / 2
  const top = (height - (rows * ROW_GAP + BLOCK_H)) / 2
  return (n: TemplateNode) => ({
    x: left + n.at[0] * colGap,
    y: top + n.at[1] * ROW_GAP,
    w: BLOCK_W,
    h: BLOCK_H,
  })
}

function makeBlock(
  n: TemplateNode,
  box: ReturnType<ReturnType<typeof layout>>,
) {
  const { style } = useSessionStore.getState()
  const block: BlockShape = createBlock(n.kind, box, style)
  return {
    ...block,
    ...(n.label && { label: n.label }),
    ...(n.icon && { icon: n.icon }),
    ...(n.sim && { sim: n.sim }),
  }
}

// One undo step. While preparing, every block and arrow becomes the next
// reveal step in drawing order; while presenting it simply appears.
export function insertTemplate(template: DiagramTemplate): void {
  const { doc } = useEngineStore.getState()
  const { presenting, style } = useSessionStore.getState()
  const place = layout(template, doc.aspect)
  const blocks = new Map<string, BlockShape>()
  for (const step of template.steps) {
    if ('node' in step)
      blocks.set(step.node.key, makeBlock(step.node, place(step.node)))
  }
  const ids: string[] = []
  commitCurrentPage((page) => {
    let next: Page = page
    let step = getHighestStep(page)
    for (const item of template.steps) {
      let shape: Shape
      if ('node' in item) {
        shape = blocks.get(item.node.key)!
      } else {
        const from = blocks.get(item.edge[0])!
        const to = blocks.get(item.edge[1])!
        shape = {
          ...createLine({ x: from.x, y: from.y }, true, style),
          startBinding: { shapeId: from.id },
          endBinding: { shapeId: to.id },
        }
      }
      const withStep = presenting ? shape : { ...shape, revealStep: ++step }
      next = addShape(next, withStep)
      ids.push(shape.id)
    }
    return rerouteConnectors(next, ids)
  })
  setTool('select')
  selectShapes(ids)
}
