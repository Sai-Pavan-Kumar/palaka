import {
  ArrowLeft,
  ArrowLeftRight,
  ArrowRight,
  CircleOff,
  Waypoints,
  type LucideIcon,
} from 'lucide-react'
import { IconButton } from '../../shared/ui/IconButton'
import { Popover } from '../../shared/ui/Popover'
import { useEngineStore } from '../engine/engineStore'
import { getSelectedLines, setFlow } from '../engine/flowActions'
import { findPage } from '../engine/model/documentOps'
import type { FlowDirection } from '../engine/model/types'
import { useSessionStore } from '../engine/sessionStore'

type FlowChoice = {
  value: FlowDirection | null
  label: string
  icon: LucideIcon
}

const FLOW_CHOICES: FlowChoice[] = [
  { value: null, label: 'No flow', icon: CircleOff },
  { value: 'forward', label: 'Start → end', icon: ArrowRight },
  { value: 'backward', label: 'End → start', icon: ArrowLeft },
  { value: 'both', label: 'Both ways', icon: ArrowLeftRight },
]

// Shown only when lines or arrows are selected: dots travelling along them
// show requests and data moving. Each flow is its own reveal step.
export function FlowMenu() {
  const doc = useEngineStore((s) => s.doc)
  const pageId = useSessionStore((s) => s.pageId)
  const selectedIds = useSessionStore((s) => s.selectedIds)
  const page = findPage(doc, pageId)
  const lines = page ? getSelectedLines(page, selectedIds) : []
  if (lines.length === 0) return null
  const directions = new Set(lines.map((line) => line.flow?.direction ?? null))
  const current = directions.size === 1 ? [...directions][0] : undefined

  return (
    <Popover
      side="below"
      trigger={({ toggle }) => (
        <IconButton
          icon={Waypoints}
          label="Flow dots"
          isActive={!!current}
          onClick={toggle}
        />
      )}
    >
      {(close) =>
        FLOW_CHOICES.map((choice) => (
          <button
            key={choice.label}
            type="button"
            className={`menu-item ${choice.value === current ? 'is-active' : ''}`}
            onClick={() => {
              setFlow(choice.value)
              close()
            }}
          >
            <choice.icon size={18} strokeWidth={1.75} aria-hidden />
            {choice.label}
          </button>
        ))
      }
    </Popover>
  )
}
