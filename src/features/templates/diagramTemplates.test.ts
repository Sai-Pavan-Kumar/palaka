import { describe, expect, it } from 'vitest'
import { AWS_ICONS } from '../icons/generated/awsIcons'
import { BRAND_ICONS } from '../icons/generated/brandIcons'
import { DIAGRAM_TEMPLATES } from './diagramTemplates'

const ICON_IDS = new Set([...AWS_ICONS, ...BRAND_ICONS].map((i) => i.id))

describe('diagram templates', () => {
  it('have unique ids', () => {
    const ids = DIAGRAM_TEMPLATES.map((t) => t.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  for (const template of DIAGRAM_TEMPLATES) {
    it(`${template.name} is wired, laid out and iconed correctly`, () => {
      const nodes = template.steps.flatMap((s) => ('node' in s ? [s.node] : []))
      const keys = new Set(nodes.map((n) => n.key))
      const cells = new Set(nodes.map((n) => n.at.join(',')))
      expect(cells.size).toBe(nodes.length)
      for (const step of template.steps) {
        if ('edge' in step) {
          expect(keys.has(step.edge[0])).toBe(true)
          expect(keys.has(step.edge[1])).toBe(true)
        }
      }
      for (const node of nodes) {
        if (node.icon) expect(ICON_IDS.has(node.icon)).toBe(true)
      }
    })
  }
})

describe('buildings', () => {
  it('every building has a drawable emblem and a unique id', async () => {
    const { BUILDINGS } = await import('../engine/model/buildings')
    const { EMBLEMS } = await import('../buildings/emblems')
    const ids = BUILDINGS.map((b) => b.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const b of BUILDINGS) expect(EMBLEMS[b.emblem]).toBeTruthy()
  })
})
