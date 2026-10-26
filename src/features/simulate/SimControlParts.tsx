import { Power, Send, StepForward } from 'lucide-react'
import { IconButton } from '../../shared/ui/IconButton'
import { useEngineStore } from '../engine/engineStore'
import { isBindable } from '../engine/model/connectors'
import { findPage } from '../engine/model/documentOps'
import { useSessionStore } from '../engine/sessionStore'
import {
  MAX_TRAFFIC,
  MIN_TRAFFIC,
  nextStep,
  sendOneRequest,
  setStepMode,
  setTraffic,
  toggleDown,
  useSimStore,
} from './simStore'

export function TrafficSlider({ traffic }: { traffic: number }) {
  return (
    <label className="sim-controls__traffic">
      <span className="sim-controls__label">Traffic</span>
      <input
        type="range"
        min={MIN_TRAFFIC}
        max={MAX_TRAFFIC}
        step={1}
        value={traffic}
        onChange={(event) => setTraffic(Number(event.target.value))}
        aria-valuetext={`${traffic} times normal traffic`}
      />
      <span className="sim-controls__value">{traffic}×</span>
    </label>
  )
}

// Live = steady traffic for load stories. Step = one request, frozen at
// each block, for "first this, then that" stories (login, saga, DNS).
export function ModeSwitch({ stepMode }: { stepMode: boolean }) {
  return (
    <div className="sim-controls__modes" role="radiogroup" aria-label="Mode">
      {[false, true].map((step) => (
        <button
          key={String(step)}
          type="button"
          role="radio"
          aria-checked={stepMode === step}
          className={`chip ${stepMode === step ? 'is-active' : ''}`}
          onClick={() => setStepMode(step)}
        >
          {step ? 'Step' : 'Live'}
        </button>
      ))}
    </div>
  )
}

export function StepButtons() {
  return (
    <>
      <IconButton
        icon={Send}
        label="Send one request"
        onClick={sendOneRequest}
      />
      <IconButton
        icon={StepForward}
        label="Next step"
        shortcut="N"
        onClick={nextStep}
      />
    </>
  )
}

// Selected blocks only; arrows and text cannot go down.
function useSelectedNodes(): string[] {
  const doc = useEngineStore((s) => s.doc)
  const pageId = useSessionStore((s) => s.pageId)
  const selectedIds = useSessionStore((s) => s.selectedIds)
  const page = findPage(doc, pageId)
  if (!page) return []
  return selectedIds.filter((id) => isBindable(page.shapes[id]))
}

// Chaos on cue: take the selected block down mid-take and let the
// audience watch the system cope (or not).
export function DownButton() {
  const ids = useSelectedNodes()
  const down = useSimStore((s) => s.down)
  if (ids.length === 0) return null
  const allDown = ids.every((id) => down.includes(id))
  return (
    <IconButton
      icon={Power}
      label={allDown ? 'Bring back up' : 'Take down'}
      isActive={allDown}
      onClick={() => toggleDown(ids)}
    />
  )
}
