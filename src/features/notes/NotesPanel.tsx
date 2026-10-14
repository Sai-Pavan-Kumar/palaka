import { X } from 'lucide-react'
import { IconButton } from '../../shared/ui/IconButton'
import { useEngineStore } from '../engine/engineStore'
import { findPage } from '../engine/model/documentOps'
import { useSessionStore } from '../engine/sessionStore'
import { useUiStore } from '../shell/uiStore'
import { useNotesStore } from './pageNotes'
import './notesPanel.css'

// Script notes are per page and live outside the board element, so they are
// readable while recording but can never appear in the video.
export function NotesPanel() {
  const isOpen = useUiStore((s) => s.isNotesOpen)
  const toggleNotes = useUiStore((s) => s.toggleNotes)
  const pageId = useSessionStore((s) => s.pageId)
  const pageName = useEngineStore((s) => findPage(s.doc, pageId)?.name ?? '')
  const note = useNotesStore((s) => s.notes[pageId] ?? '')
  const setNote = useNotesStore((s) => s.setNote)

  return (
    <aside
      className={`notes-panel chrome ${isOpen ? 'is-open' : ''}`}
      aria-hidden={!isOpen}
      inert={!isOpen}
    >
      <header className="notes-panel__header">
        <div>
          <p className="menu-label">Private notes</p>
          <h2 className="notes-panel__title">{pageName}</h2>
        </div>
        <IconButton icon={X} label="Close notes" onClick={toggleNotes} />
      </header>
      <textarea
        className="notes-panel__text"
        value={note}
        placeholder="What you want to say on this page. Only you see this."
        onChange={(event) => setNote(pageId, event.target.value)}
      />
    </aside>
  )
}
