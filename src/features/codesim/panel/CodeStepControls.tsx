import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  X,
} from 'lucide-react'
import { IconButton } from '../../../shared/ui/IconButton'
import {
  jumpCodeSim,
  stepCodeSim,
  stopCodeSim,
  useCodeSimStore,
} from '../codeSimStore'

export function CodeStepControls() {
  const index = useCodeSimStore((s) => s.index)
  const total = useCodeSimStore((s) => s.steps.length)
  if (total === 0) return null
  return (
    <div className="code-panel__steps" role="group" aria-label="Step through">
      <IconButton
        icon={ChevronsLeft}
        label="First step"
        onClick={() => jumpCodeSim('start')}
      />
      <IconButton
        icon={ChevronLeft}
        label="Back (Shift+Space)"
        onClick={() => stepCodeSim(-1)}
      />
      <span className="code-panel__count" aria-live="polite">
        Step {index + 1} / {total}
      </span>
      <IconButton
        icon={ChevronRight}
        label="Next (Space)"
        onClick={() => stepCodeSim(1)}
      />
      <IconButton
        icon={ChevronsRight}
        label="Last step"
        onClick={() => jumpCodeSim('end')}
      />
      <IconButton icon={X} label="Stop (Esc)" onClick={stopCodeSim} />
    </div>
  )
}
