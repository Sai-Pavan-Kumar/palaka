import { Gauge } from 'lucide-react'
import { IconButton } from '../../shared/ui/IconButton'
import { Popover } from '../../shared/ui/Popover'
import { commitCurrentPage } from '../engine/boardActions'
import { useEngineStore } from '../engine/engineStore'
import { findPage } from '../engine/model/documentOps'
import type { BlockShape, SimSettings } from '../engine/model/types'
import { useSessionStore } from '../engine/sessionStore'
import { getNodeConfig } from './behaviours/nodeConfig'
import type { BehaviourKind, NodeConfig } from './simTypes'

type Field = {
  key: keyof SimSettings & keyof NodeConfig
  label: string
  choices: number[]
  format?: (value: number) => string
}

// Few, round numbers: picking "10/s" on camera beats typing into a field.
const FIELDS: Partial<Record<BehaviourKind, Field[]>> = {
  limiter: [
    { key: 'rate', label: 'Allowed per second', choices: [2, 5, 10, 20] },
  ],
  cache: [
    {
      key: 'hitRate',
      label: 'Hit rate',
      choices: [0.5, 0.7, 0.9, 0.99],
      format: (v) => `${Math.round(v * 100)}%`,
    },
  ],
  queue: [
    { key: 'size', label: 'Holds', choices: [5, 12, 25, 50] },
    { key: 'rate', label: 'Drains per second', choices: [1, 2, 5, 10] },
  ],
  service: [
    { key: 'capacity', label: 'Works on at once', choices: [1, 2, 4, 8] },
  ],
}

function setSim(ids: string[], key: Field['key'], value: number): void {
  commitCurrentPage((page) => {
    const shapes = { ...page.shapes }
    for (const id of ids) {
      const block = shapes[id] as BlockShape
      shapes[id] = { ...block, sim: { ...block.sim, [key]: value } }
    }
    return { ...page, shapes }
  })
}

function FieldChips({ field, blocks }: { field: Field; blocks: BlockShape[] }) {
  const values = new Set(blocks.map((b) => getNodeConfig(b)[field.key]))
  const current = values.size === 1 ? [...values][0] : undefined
  return (
    <>
      <p className="menu-label">{field.label}</p>
      <div className="chip-row">
        {field.choices.map((value) => (
          <button
            key={value}
            type="button"
            className={`chip ${current === value ? 'is-active' : ''}`}
            aria-pressed={current === value}
            onClick={() =>
              setSim(
                blocks.map((b) => b.id),
                field.key,
                value,
              )
            }
          >
            {field.format ? field.format(value) : value}
          </button>
        ))}
      </div>
    </>
  )
}

// Numbers for the selected blocks' simulation. Shown only when every
// selected block behaves the same way, so one set of chips fits them all.
export function SimSettingsMenu() {
  const doc = useEngineStore((s) => s.doc)
  const pageId = useSessionStore((s) => s.pageId)
  const selectedIds = useSessionStore((s) => s.selectedIds)
  const page = findPage(doc, pageId)
  const blocks = (page ? selectedIds.map((id) => page.shapes[id]) : []).filter(
    (s): s is BlockShape => s?.type === 'block',
  )
  if (blocks.length === 0 || blocks.length !== selectedIds.length) return null
  const kinds = new Set(blocks.map((b) => getNodeConfig(b).behaviour))
  const fields = kinds.size === 1 ? FIELDS[[...kinds][0]] : undefined
  if (!fields) return null
  return (
    <Popover
      side="below"
      trigger={({ toggle }) => (
        <IconButton
          icon={Gauge}
          label="Simulation numbers"
          isActive={blocks.some((b) => b.sim)}
          onClick={toggle}
        />
      )}
    >
      {() => (
        <div style={{ minWidth: 240 }}>
          {fields.map((field) => (
            <FieldChips key={field.key} field={field} blocks={blocks} />
          ))}
        </div>
      )}
    </Popover>
  )
}
