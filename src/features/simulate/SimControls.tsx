import { GripVertical, Pause, Play, RotateCcw, X } from 'lucide-react'
import { IconButton } from '../../shared/ui/IconButton'
import {
  DownButton,
  ModeSwitch,
  StepButtons,
  TrafficSlider,
} from './SimControlParts'
import {
  resetSimulation,
  stopSimulation,
  togglePlaying,
  useSimStore,
} from './simStore'
import './simulate.css'
import { useDraggableBar } from './useDraggableBar'

function Grip(props: ReturnType<typeof useDraggableBar>['handleProps']) {
  return (
    <span
      className="sim-controls__grip"
      title="Drag to move"
      aria-hidden
      {...props}
    >
      <GripVertical size={18} />
    </span>
  )
}

// Sits outside the recorded board: the audience sees traffic rise, not
// the slider that raised it.
export function SimControls() {
  const active = useSimStore((s) => s.active)
  const playing = useSimStore((s) => s.playing)
  const traffic = useSimStore((s) => s.traffic)
  const stepMode = useSimStore((s) => s.stepMode)
  const { style, handleProps } = useDraggableBar()
  if (!active) return null
  return (
    <div
      className="sim-controls floating-bar chrome"
      role="toolbar"
      aria-label="Simulation"
      style={style}
    >
      <Grip {...handleProps} />
      <ModeSwitch stepMode={stepMode} />
      <IconButton
        icon={playing ? Pause : Play}
        label={playing ? 'Pause' : 'Play'}
        isActive={playing}
        onClick={togglePlaying}
      />
      {stepMode ? <StepButtons /> : <TrafficSlider traffic={traffic} />}
      <DownButton />
      <IconButton
        icon={RotateCcw}
        label="Restart run"
        onClick={resetSimulation}
      />
      <span className="floating-bar__divider" />
      <IconButton
        icon={X}
        label="Stop simulation"
        shortcut="Esc"
        onClick={stopSimulation}
      />
    </div>
  )
}
