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
import {
  getSelectedLines,
  setFlow,
  setFlowSpeed,
  setFlowStyle,
} from '../engine/flowActions'
import { findPage } from '../engine/model/documentOps'
import type {
  FlowDirection,
  FlowSpeed,
  FlowStyle,
  LineShape,
} from '../engine/model/types'
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

const SPEED_CHOICES: { value: FlowSpeed; label: string }[] = [
  { value: 'slow', label: 'Slow' },
  { value: 'normal', label: 'Normal' },
  { value: 'fast', label: 'Fast' },
]

const STYLE_CHOICES: { value: FlowStyle; label: string }[] = [
  { value: 'dots', label: 'Dots' },
  { value: 'pulse', label: 'Pulse' },
]

function FlowSubSection<T extends string>({
  label,
  choices,
  current,
  columns,
  onPick,
}: {
  label: string
  choices: { value: T; label: string }[]
  current: T | undefined
  columns: number
  onPick: (val: T) => void
}) {
  return (
    <>
      <p className="menu-label">{label}</p>
      <div className={`chip-row chip-row--${columns}`}>
        {choices.map((choice) => (
          <button
            key={choice.value}
            type="button"
            className={`chip ${current === choice.value ? 'is-active' : ''}`}
            aria-pressed={current === choice.value}
            onClick={() => onPick(choice.value)}
          >
            {choice.label}
          </button>
        ))}
      </div>
    </>
  )
}

function useLineFlowState(lines: LineShape[]) {
  const directions = new Set(lines.map((l) => l.flow?.direction ?? null))
  const currentDir = directions.size === 1 ? [...directions][0] : undefined
  const speeds = new Set(lines.map((l) => l.flow?.speed ?? 'normal'))
  const currentSpeed = speeds.size === 1 ? [...speeds][0] : undefined
  const styles = new Set(lines.map((l) => l.flow?.style ?? 'dots'))
  const currentStyle = styles.size === 1 ? [...styles][0] : undefined
  return { currentDir, currentSpeed, currentStyle }
}

function FlowMenuPanel({
  currentDir,
  currentSpeed,
  currentStyle,
  onClose,
}: {
  currentDir: FlowDirection | null | undefined
  currentSpeed: FlowSpeed | undefined
  currentStyle: FlowStyle | undefined
  onClose: () => void
}) {
  return (
    <div style={{ minWidth: 200 }}>
      {FLOW_CHOICES.map((choice) => (
        <button
          key={choice.label}
          type="button"
          className={`menu-item ${choice.value === currentDir ? 'is-active' : ''}`}
          onClick={() => {
            setFlow(choice.value)
            if (choice.value === null) onClose()
          }}
        >
          <choice.icon size={18} strokeWidth={1.75} aria-hidden />
          {choice.label}
        </button>
      ))}
      {currentDir && (
        <>
          <FlowSubSection
            label="Speed"
            choices={SPEED_CHOICES}
            current={currentSpeed}
            columns={3}
            onPick={setFlowSpeed}
          />
          <FlowSubSection
            label="Style"
            choices={STYLE_CHOICES}
            current={currentStyle}
            columns={2}
            onPick={setFlowStyle}
          />
        </>
      )}
    </div>
  )
}

// Shown only when lines or arrows are selected: dots travelling along them
// show requests and data moving. Each flow is its own reveal step.
export function FlowMenu() {
  const doc = useEngineStore((s) => s.doc)
  const pageId = useSessionStore((s) => s.pageId)
  const selectedIds = useSessionStore((s) => s.selectedIds)
  const page = findPage(doc, pageId)
  const lines = page ? getSelectedLines(page, selectedIds) : []
  const { currentDir, currentSpeed, currentStyle } = useLineFlowState(lines)

  if (lines.length === 0) return null

  return (
    <Popover
      side="below"
      trigger={({ toggle }) => (
        <IconButton
          icon={Waypoints}
          label="Flow dots & pulse"
          isActive={!!currentDir}
          onClick={toggle}
        />
      )}
    >
      {(close) => (
        <FlowMenuPanel
          currentDir={currentDir}
          currentSpeed={currentSpeed}
          currentStyle={currentStyle}
          onClose={close}
        />
      )}
    </Popover>
  )
}
