import { useEngineStore } from '../engine/engineStore'
import { findPage } from '../engine/model/documentOps'
import { useSessionStore } from '../engine/sessionStore'
import { useUiStore } from '../shell/uiStore'
import { ModeSwitch } from './SimControlParts'
import { buildSimGraph } from './simGraph'
import { toggleSimulation, useSimStore } from './simStore'

// An empty run looks exactly like a broken button, so say what is missing.
function pageHasBlocks(): boolean {
  const { doc } = useEngineStore.getState()
  const page = findPage(doc, useSessionStore.getState().pageId) ?? doc.pages[0]
  return !!page && buildSimGraph(page).nodes.size > 0
}

// Starting hides the panel so the traffic is visible at once; stopping
// leaves it open, since the user is back to editing.
function toggleAndReveal(): void {
  if (!useSimStore.getState().active && !pageHasBlocks()) {
    useUiStore
      .getState()
      .showToast(
        'Add blueprint blocks and join them with arrows first.',
        'info',
      )
    return
  }
  toggleSimulation()
  if (useSimStore.getState().active) {
    useUiStore.setState({ isLeftPanelOpen: false })
  }
}

// The diagram on the board is this mode's input, so the panel only starts
// the run. Live controls stay in the floating bar, which keeps working after
// the panel is closed for recording.
export function SimPanel() {
  const isActive = useSimStore((s) => s.active)
  const stepMode = useSimStore((s) => s.stepMode)
  return (
    <div className="sql-panel">
      <p className="left-panel__empty">
        Draw blocks and join them with arrows. Traffic flows along the arrows,
        and each block behaves like its kind: cache, queue, load balancer and
        more.
      </p>
      <ModeSwitch stepMode={stepMode} />
      <div className="sql-panel__actions">
        <button
          type="button"
          className="sql-panel__insert"
          onClick={toggleAndReveal}
        >
          {isActive ? 'Stop simulation' : 'Start simulation'}
        </button>
      </div>
    </div>
  )
}
