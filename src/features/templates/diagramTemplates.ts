import type { BlockKind, SimSettings } from '../engine/model/types'
import { BASICS } from './catalog/basics'
import { CONCEPTS } from './catalog/concepts'
import { RELIABILITY } from './catalog/reliability'
import { DATA } from './catalog/data'
import { MESSAGING } from './catalog/messaging'
import { REAL_SYSTEMS } from './catalog/realSystems'
import { SCALING } from './catalog/scaling'

export type TemplateNode = {
  key: string
  kind: BlockKind
  // Grid cell (column, row); the inserter turns it into slide pixels.
  at: [col: number, row: number]
  label?: string
  // Library icon id, e.g. "si:redis".
  icon?: string
  sim?: SimSettings
}

// Steps in the order a teacher would draw them while talking, so Present
// reveals the story left to right: node, the arrow into the next, node…
export type TemplateStep =
  { node: TemplateNode } | { edge: [from: string, to: string] }

export type DiagramTemplate = {
  id: string
  category: string
  name: string
  // What the simulation shows when you press play on it.
  teaches: string
  steps: TemplateStep[]
}

// Grouped the way a system design course runs: basics, scaling, data,
// messaging, reliability, concept comparisons, then whole real systems.
export const DIAGRAM_TEMPLATES: DiagramTemplate[] = [
  ...BASICS,
  ...SCALING,
  ...DATA,
  ...MESSAGING,
  ...RELIABILITY,
  ...CONCEPTS,
  ...REAL_SYSTEMS,
]
