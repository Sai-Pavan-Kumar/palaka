import { Clapperboard } from 'lucide-react'
import { IconButton } from '../../shared/ui/IconButton'
import { Popover } from '../../shared/ui/Popover'
import { useEngineStore } from '../engine/engineStore'
import { findPage } from '../engine/model/documentOps'
import type {
  AnimSpeed,
  EnterStyle,
  ExitStyle,
  Shape,
} from '../engine/model/types'
import { useSessionStore } from '../engine/sessionStore'
import {
  getAnimatable,
  setAnimSpeed,
  setEnter,
  setExit,
  setPulse,
} from './animateActions'

type Choice<T> = { value: T; label: string }

// A short list on purpose: a few motions that look good on video beat
// thirty that make a talk look like an old slide deck.
const ENTER_CHOICES: Choice<EnterStyle>[] = [
  { value: 'draw', label: 'Draw' },
  { value: 'fade', label: 'Fade' },
  { value: 'pop', label: 'Pop' },
  { value: 'rise', label: 'Rise' },
]

const EXIT_CHOICES: Choice<ExitStyle | 'none'>[] = [
  { value: 'none', label: 'Stay' },
  { value: 'fade', label: 'Fade out' },
  { value: 'shrink', label: 'Shrink' },
]

const PULSE_CHOICES: Choice<'off' | 'on'>[] = [
  { value: 'off', label: 'No pulse' },
  { value: 'on', label: 'Pulse once' },
]

const SPEED_CHOICES: Choice<AnimSpeed | 'normal'>[] = [
  { value: 'fast', label: 'Fast' },
  { value: 'normal', label: 'Normal' },
  { value: 'slow', label: 'Slow' },
]

function ChipSection<T extends string>({
  label,
  choices,
  current,
  onPick,
}: {
  label: string
  choices: Choice<T>[]
  current: T | undefined
  onPick: (value: T) => void
}) {
  return (
    <>
      <p className="menu-label">{label}</p>
      <div className={`chip-row chip-row--${choices.length}`}>
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

// The value every selected shape agrees on, else no chip lights up.
function shared<T>(shapes: Shape[], read: (shape: Shape) => T): T | undefined {
  const values = new Set(shapes.map(read))
  return values.size === 1 ? [...values][0] : undefined
}

function AnimatePanel({ shapes }: { shapes: Shape[] }) {
  return (
    <div style={{ minWidth: 240 }}>
      <ChipSection
        label="Enter"
        choices={ENTER_CHOICES}
        current={shared(shapes, (s) => s.enter ?? 'draw')}
        onPick={setEnter}
      />
      <ChipSection
        label="Exit"
        choices={EXIT_CHOICES}
        current={shared(shapes, (s) => s.exit?.style ?? 'none')}
        onPick={(value) => setExit(value === 'none' ? null : value)}
      />
      <ChipSection
        label="Emphasis"
        choices={PULSE_CHOICES}
        current={shared(shapes, (s) => (s.pulseStep ? 'on' : 'off'))}
        onPick={(value) => setPulse(value === 'on')}
      />
      <ChipSection
        label="Speed"
        choices={SPEED_CHOICES}
        current={shared(shapes, (s) => s.animSpeed ?? 'normal')}
        onPick={setAnimSpeed}
      />
    </div>
  )
}

// How the selection arrives, leaves and asks for attention while
// presenting. Exit and pulse join the reveal order as their own steps.
export function AnimateMenu() {
  const doc = useEngineStore((s) => s.doc)
  const pageId = useSessionStore((s) => s.pageId)
  const selectedIds = useSessionStore((s) => s.selectedIds)
  const page = findPage(doc, pageId)
  const shapes = page ? getAnimatable(page, selectedIds) : []
  if (shapes.length === 0) return null
  const isCustom = shapes.some(
    (s) => s.enter || s.exit || s.pulseStep || s.animSpeed,
  )
  return (
    <Popover
      side="below"
      trigger={({ toggle }) => (
        <IconButton
          icon={Clapperboard}
          label="Animate"
          isActive={isCustom}
          onClick={toggle}
        />
      )}
    >
      {() => <AnimatePanel shapes={shapes} />}
    </Popover>
  )
}
