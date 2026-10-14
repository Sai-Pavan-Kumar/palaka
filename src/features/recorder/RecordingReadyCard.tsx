import { Download, X } from 'lucide-react'
import { IconButton } from '../../shared/ui/IconButton'
import { useRecorderStore } from './recorderStore'
import './recordControls.css'

// Shown after every recording, outside the board. The preview is the honest
// check: if it shows toolbars, board-only capture did not work.
export function RecordingReadyCard() {
  const take = useRecorderStore((s) => s.lastTake)
  const closeTake = useRecorderStore((s) => s.closeTake)
  if (!take) return null

  return (
    <aside className="take-card chrome" aria-label="Recording ready">
      <header className="take-card__header">
        <div>
          <p className="menu-label">Recording ready</p>
          <p className="take-card__where">
            {take.savedPath
              ? `Saved in ${take.savedPath}`
              : 'Not saved yet. Download it below.'}
          </p>
        </div>
        <IconButton icon={X} label="Close" onClick={closeTake} />
      </header>
      <video className="take-card__video" src={take.url} controls />
      <a
        className="take-card__download"
        href={take.url}
        download={take.fileName}
      >
        <Download size={18} strokeWidth={1.75} aria-hidden />
        Download video
      </a>
    </aside>
  )
}
