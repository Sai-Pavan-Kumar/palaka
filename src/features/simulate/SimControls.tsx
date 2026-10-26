import { Pause, Play, RotateCcw, X } from 'lucide-react'
import { IconButton } from '../../shared/ui/IconButton'
import {
  MAX_TRAFFIC,
  MIN_TRAFFIC,
  resetSimulation,
  setTraffic,
  stopSimulation,
  togglePlaying,
  useSimStore,
} from './simStore'
import './simulate.css'

// Sits outside the recorded board: the audience sees traffic rise, not
// the slider that raised it.
export function SimControls() {
  const active = useSimStore((s) => s.active)
  const playing = useSimStore((s) => s.playing)
  const traffic = useSimStore((s) => s.traffic)
  if (!active) return null
  return (
    <div
      className="sim-controls floating-bar chrome"
      role="toolbar"
      aria-label="Simulation"
    >
      <IconButton
        icon={playing ? Pause : Play}
        label={playing ? 'Pause traffic' : 'Play traffic'}
        isActive={playing}
        onClick={togglePlaying}
      />
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
