import { useValue } from 'tldraw'
import { useActiveEditor } from '../board/boardStore'
import { getRevealSession, getStepCount } from './revealModel'
import './reveal.css'

// Lives in the page bar, outside the board: only the speaker sees it.
export function StepCounter() {
  const editor = useActiveEditor()
  const counter = useValue(
    'step counter',
    () => {
      const { presenting, revealedUpTo } = getRevealSession(editor)
      if (!presenting) return null
      const pageId = editor.getCurrentPageId()
      return {
        shown: revealedUpTo[pageId] ?? 0,
        total: getStepCount(editor, pageId),
      }
    },
    [editor],
  )
  if (!counter) return null

  return (
    <div className="step-counter floating-bar" role="status">
      <span className="step-counter__live" aria-hidden />
      Step {counter.shown} / {counter.total}
      <span className="step-counter__hint">Space next · ← back</span>
    </div>
  )
}
