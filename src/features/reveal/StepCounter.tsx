import { useEngineStore } from '../engine/engineStore'
import { findPage } from '../engine/model/documentOps'
import { useSessionStore } from '../engine/sessionStore'
import { getStepCount } from './revealModel'
import { useArmedCodeCount } from '../codesim/presentCodeSim'
import './reveal.css'

// Lives in the page bar, outside the board: only the speaker sees it.
export function StepCounter() {
  const presenting = useSessionStore((s) => s.presenting)
  const pageId = useSessionStore((s) => s.pageId)
  const shown = useSessionStore((s) => s.revealedUpTo[pageId] ?? 0)
  const total = useEngineStore((s) => {
    const page = findPage(s.doc, pageId)
    return page ? getStepCount(page) : 0
  })
  const code = useArmedCodeCount()
  if (!presenting) return null

  return (
    <div className="step-counter floating-bar" role="status">
      <span className="step-counter__live" aria-hidden />
      Step {shown} / {total}
      {code && (
        <span className="step-counter__code">
          · code {code.index + 1} / {code.total}
        </span>
      )}
      <span className="step-counter__hint">Space next · ← back</span>
    </div>
  )
}
