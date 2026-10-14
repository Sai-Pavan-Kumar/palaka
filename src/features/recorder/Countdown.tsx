import { useRecorderStore } from './recorderStore'
import './recordControls.css'

// Rendered as a sibling of the board, and the recorder only starts after it
// ends, so the 3-2-1 never appears in the video.
export function Countdown() {
  const status = useRecorderStore((s) => s.status)
  const countdown = useRecorderStore((s) => s.countdown)
  if (status !== 'countdown') return null
  return (
    <div className="countdown" role="status" aria-live="assertive">
      <span key={countdown} className="countdown__number">
        {countdown}
      </span>
    </div>
  )
}
