import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  GripVertical,
  X,
} from 'lucide-react'
import { IconButton } from '../../../shared/ui/IconButton'
import '../../simulate/simulate.css'
import { useDraggableBar } from '../../simulate/useDraggableBar'
import {
  jumpCodeSim,
  stepCodeSim,
  stopCodeSim,
  useCodeSimStore,
} from '../codeSimStore'
import './codePanel.css'

function StepButtons({ index, total }: { index: number; total: number }) {
  const isFirst = index === 0
  const isLast = index === total - 1
  return (
    <>
      <IconButton
        icon={ChevronsLeft}
        label="First step"
        disabled={isFirst}
        onClick={() => jumpCodeSim('start')}
      />
      <IconButton
        icon={ChevronLeft}
        label="Back"
        shortcut="Shift+Space"
        disabled={isFirst}
        onClick={() => stepCodeSim(-1)}
      />
      <span
        className="code-panel__count"
        aria-live="polite"
        aria-label={`Step ${index + 1} of ${total}`}
      >
        Step {index + 1} / {total}
      </span>
      <IconButton
        icon={ChevronRight}
        label="Next"
        shortcut="Space"
        disabled={isLast}
        onClick={() => stepCodeSim(1)}
      />
      <IconButton
        icon={ChevronsRight}
        label="Last step"
        disabled={isLast}
        onClick={() => jumpCodeSim('end')}
      />
    </>
  )
}

// Outside the recorded board, like GitControls, so the panel can close and
// stop covering the code card while the run is still driven from here.
export function CodeStepControls() {
  const index = useCodeSimStore((s) => s.index)
  const total = useCodeSimStore((s) => s.steps.length)
  const { style, handleProps } = useDraggableBar()
  if (total === 0) return null
  return (
    <div
      className="sim-controls floating-bar chrome"
      role="toolbar"
      aria-label="Code run"
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
      <StepButtons index={index} total={total} />
      <span className="floating-bar__divider" />
      <IconButton
        icon={X}
        label="Stop code run"
        shortcut="Esc"
        onClick={stopCodeSim}
      />
    </div>
  )
}
