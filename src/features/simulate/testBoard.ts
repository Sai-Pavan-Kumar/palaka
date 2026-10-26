// Test helper: a row of blocks joined by straight arrows.
import {
  createBlock,
  createLine,
  DEFAULT_STYLE,
} from '../engine/model/shapeFactory'
import type {
  BlockKind,
  BlockShape,
  LineShape,
  Page,
  SimSettings,
} from '../engine/model/types'
import { buildSimGraph } from './simGraph'
import { SimEngine } from './simEngine'

export type Board = { page: Page; ids: Record<string, string> }

// Blocks sit 300 apart on one row; arrows are straight between them.
export function board(
  blocks: [name: string, kind: BlockKind, sim?: SimSettings][],
  links: [from: string, to: string, arrow?: boolean][],
): Board {
  const ids: Record<string, string> = {}
  const shapes: Page['shapes'] = {}
  const order: string[] = []
  blocks.forEach(([name, kind, sim], i) => {
    const block: BlockShape = {
      ...createBlock(kind, { x: i * 300, y: 0, w: 120, h: 80 }, DEFAULT_STYLE),
      ...(sim && { sim }),
    }
    ids[name] = block.id
    shapes[block.id] = block
    order.push(block.id)
  })
  for (const [from, to, arrow = true] of links) {
    const a = shapes[ids[from]] as BlockShape
    const b = shapes[ids[to]] as BlockShape
    const line: LineShape = {
      ...createLine({ x: a.x + 60, y: 40 }, arrow, DEFAULT_STYLE),
      x2: b.x + 60,
      y2: 40,
      startBinding: { shapeId: a.id },
      endBinding: { shapeId: b.id },
    }
    shapes[line.id] = line
    order.push(line.id)
  }
  return { page: { id: 'p', name: 'P', shapes, order }, ids }
}

export function run(
  b: Board,
  traffic: number,
  seconds: number,
  setup?: (engine: SimEngine) => void,
): SimEngine {
  const engine = new SimEngine(buildSimGraph(b.page))
  engine.traffic = traffic
  setup?.(engine)
  for (let t = 0; t < seconds; t += 0.1) engine.advance(0.1)
  return engine
}

export const stats = (e: SimEngine, b: Board, name: string) =>
  e.states.get(b.ids[name])!.stats
