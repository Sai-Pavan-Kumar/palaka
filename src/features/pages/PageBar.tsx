import {
  ChevronLeft,
  ChevronRight,
  NotebookPen,
  Plus,
  Trash2,
} from 'lucide-react'
import { useValue } from 'tldraw'
import { IconButton } from '../../shared/ui/IconButton'
import { Popover } from '../../shared/ui/Popover'
import { useActiveEditor } from '../board/boardStore'
import { StepCounter } from '../reveal/StepCounter'
import { useUiStore } from '../shell/uiStore'
import {
  addPageAfterCurrent,
  deleteCurrentPage,
  goToPageOffset,
} from './pageActions'
import './pageBar.css'

function PageList() {
  const editor = useActiveEditor()
  const pages = useValue('pages', () => editor.getPages(), [editor])
  const currentId = useValue('current page', () => editor.getCurrentPageId(), [
    editor,
  ])
  const position = pages.findIndex((page) => page.id === currentId) + 1

  return (
    <Popover
      side="above"
      trigger={({ toggle }) => (
        <button type="button" className="page-bar__label" onClick={toggle}>
          Page {position} / {pages.length}
        </button>
      )}
    >
      {(close) => (
        <>
          {pages.map((page, index) => (
            <button
              key={page.id}
              type="button"
              className={`menu-item ${page.id === currentId ? 'is-active' : ''}`}
              onClick={() => {
                editor.setCurrentPage(page.id)
                close()
              }}
            >
              <span className="menu-item__hint page-bar__index">
                {index + 1}
              </span>
              {page.name}
            </button>
          ))}
          <DeletePageItem canDelete={pages.length > 1} onDone={close} />
        </>
      )}
    </Popover>
  )
}

// Undo (Ctrl Z) brings a deleted page back, so no confirm dialog is needed.
function DeletePageItem({
  canDelete,
  onDone,
}: {
  canDelete: boolean
  onDone: () => void
}) {
  const editor = useActiveEditor()
  return (
    <button
      type="button"
      className="menu-item"
      disabled={!canDelete}
      onClick={() => {
        deleteCurrentPage(editor)
        onDone()
      }}
    >
      <Trash2 size={18} strokeWidth={1.75} aria-hidden />
      Delete this page
    </button>
  )
}

export function PageBar() {
  const editor = useActiveEditor()
  const isNotesOpen = useUiStore((s) => s.isNotesOpen)
  const toggleNotes = useUiStore((s) => s.toggleNotes)

  return (
    <footer className="page-bar chrome">
      <div className="floating-bar">
        <IconButton
          icon={ChevronLeft}
          label="Previous page"
          shortcut="PgUp"
          tooltipSide="above"
          onClick={() => goToPageOffset(editor, -1)}
        />
        <PageList />
        <IconButton
          icon={ChevronRight}
          label="Next page"
          shortcut="PgDn"
          tooltipSide="above"
          onClick={() => goToPageOffset(editor, 1)}
        />
        <IconButton
          icon={Plus}
          label="New page"
          tooltipSide="above"
          onClick={() => addPageAfterCurrent(editor)}
        />
        <span className="floating-bar__divider" />
        <IconButton
          icon={NotebookPen}
          label="Script notes (private)"
          tooltipSide="above"
          isActive={isNotesOpen}
          onClick={toggleNotes}
        />
      </div>
      <StepCounter />
    </footer>
  )
}
