import { FolderOpen } from 'lucide-react'
import { Popover } from '../../shared/ui/Popover'
import {
  useProjectStore,
  type SaveStatus as SaveStatusValue,
} from '../project/projectStore'
import { useOpenFolder } from '../project/useOpenFolder'
import { useRecorderStore } from '../recorder/recorderStore'
import './shell.css'

const STATUS_LABELS: Record<SaveStatusValue, string> = {
  saved: 'Saved',
  saving: 'Saving…',
  error: 'Not saved, check folder access',
}

function OpenFolderButton({ label }: { label: string }) {
  const { isOpening, openFolder, isSupported } = useOpenFolder()
  const isRecording = useRecorderStore((s) => s.status !== 'idle')
  return (
    <button
      type="button"
      className="menu-item"
      disabled={!isSupported || isOpening || isRecording}
      title={isSupported ? undefined : 'Needs Chrome or Edge on desktop'}
      onClick={() => void openFolder()}
    >
      <FolderOpen size={16} strokeWidth={1.75} aria-hidden />
      {isOpening ? 'Opening…' : label}
    </button>
  )
}

// Folder name plus a quiet save light, so "did it save?" never needs asking.
// With no folder, the board still survives refreshes in browser storage.
export function SaveStatus() {
  const folderName = useProjectStore((s) => s.project?.folderName)
  const status = useProjectStore((s) => s.saveStatus)

  if (!folderName) {
    return (
      <div className="save-status chrome">
        <OpenFolderButton label="Open folder" />
        <span className="save-status__dot" aria-hidden />
        Kept in this browser
      </div>
    )
  }

  return (
    <div className={`save-status chrome is-${status}`}>
      <Popover
        align="start"
        side="above"
        trigger={({ toggle }) => (
          <button type="button" className="menu-item" onClick={toggle}>
            <FolderOpen size={16} strokeWidth={1.75} aria-hidden />
            {folderName}
          </button>
        )}
      >
        {() => <OpenFolderButton label="Open another folder" />}
      </Popover>
      <span className="save-status__dot" aria-hidden />
      {STATUS_LABELS[status]}
    </div>
  )
}
