import { ChevronLeft, ChevronRight, GripVertical, X } from 'lucide-react'
import { IconButton } from '../../../shared/ui/IconButton'
import '../../simulate/simulate.css'
import { useDraggableBar } from '../../simulate/useDraggableBar'
import { stepGitSim, stopGitSim, useGitSimStore } from '../gitSimStore'

// Outside the recorded board, like SimControls: the audience sees the
// graph move, not the buttons that moved it.
export function GitControls() {
  const index = useGitSimStore((s) => s.index)
  const total = useGitSimStore((s) => s.steps.length)
  const { style, handleProps } = useDraggableBar()
  if (total === 0) return null
  return (
    <div
      className="sim-controls floating-bar chrome"
      role="toolbar"
      aria-label="Git run"
      style={style}
    >
      <span
        className="sim-controls__grip"
        title="Drag to move"
        aria-hidden
        {...handleProps}
      >
        <GripVertical size={18} />
      </span>
      <IconButton
        icon={ChevronLeft}
        label="Back"
        shortcut="Shift+Space"
        disabled={index === 0}
        onClick={() => stepGitSim(-1)}
      />
      <span className="code-panel__count" aria-live="polite">
        Step {index} / {total - 1}
      </span>
      <IconButton
        icon={ChevronRight}
        label="Next"
        shortcut="Space"
        disabled={index === total - 1}
        onClick={() => stepGitSim(1)}
      />
      <span className="floating-bar__divider" />
      <IconButton
        icon={X}
        label="Clear Git run from board"
        shortcut="Esc or Delete"
        onClick={stopGitSim}
      />
    </div>
  )
}
