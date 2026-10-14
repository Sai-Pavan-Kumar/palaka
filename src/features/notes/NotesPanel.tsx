import { X } from 'lucide-react'
import { useValue } from 'tldraw'
import { IconButton } from '../../shared/ui/IconButton'
import { useActiveEditor } from '../board/boardStore'
import { useUiStore } from '../shell/uiStore'
import { getPageNote, setPageNote } from './pageNotes'
import './notesPanel.css'

// Script notes are per page and live outside the board element, so they are
// readable while recording but can never appear in the video.
export function NotesPanel() {
  const editor = useActiveEditor()
  const isOpen = useUiStore((s) => s.isNotesOpen)
  const toggleNotes = useUiStore((s) => s.toggleNotes)
  const pageId = useValue('current page', () => editor.getCurrentPageId(), [
    editor,
  ])
  const pageName = useValue('page name', () => editor.getCurrentPage().name, [
    editor,
  ])
  const note = useValue('page note', () => getPageNote(editor, pageId), [
    editor,
    pageId,
  ])

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
        onChange={(event) => setPageNote(editor, pageId, event.target.value)}
      />
    </aside>
  )
}
