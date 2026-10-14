import {
  ChevronLeft,
  ChevronRight,
  NotebookPen,
  Plus,
  RectangleHorizontal,
  RectangleVertical,
  Trash2,
} from 'lucide-react'
import { IconButton } from '../../shared/ui/IconButton'
import { Popover } from '../../shared/ui/Popover'
import { useEngineStore } from '../engine/engineStore'
import { useSessionStore } from '../engine/sessionStore'
import { PaperMenu } from '../paper/PaperMenu'
import { StepCounter } from '../reveal/StepCounter'
import { useUiStore } from '../shell/uiStore'
import {
  addPageAfterCurrent,
  deleteCurrentPage,
  goToPageOffset,
  setAspect,
  switchToPage,
} from './pageActions'
import './pageBar.css'

function PageList() {
  const pages = useEngineStore((s) => s.doc.pages)
  const currentId = useSessionStore((s) => s.pageId)
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
                switchToPage(page.id)
                close()
              }}
            >
              <span className="menu-item__hint page-bar__index">
                {index + 1}
              </span>
              {page.name}
            </button>
          ))}
          <button
            type="button"
            className="menu-item"
            disabled={pages.length <= 1}
            onClick={() => {
              deleteCurrentPage()
              close()
            }}
          >
            <Trash2 size={18} strokeWidth={1.75} aria-hidden />
            Delete this page
          </button>
        </>
      )}
    </Popover>
  )
}

// One shape for the whole board: a video is either landscape or portrait.
function AspectToggle() {
  const aspect = useEngineStore((s) => s.doc.aspect)
  const isPortrait = aspect === '9:16'
  return (
    <IconButton
      icon={isPortrait ? RectangleVertical : RectangleHorizontal}
      label={
        isPortrait
          ? 'Portrait 9:16 (click for landscape 16:9)'
          : 'Landscape 16:9 (click for portrait 9:16)'
      }
      tooltipSide="above"
      onClick={() => setAspect(isPortrait ? '16:9' : '9:16')}
    />
  )
}

export function PageBar() {
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
          onClick={() => goToPageOffset(-1)}
        />
        <PageList />
        <IconButton
          icon={ChevronRight}
          label="Next page"
          shortcut="PgDn"
          tooltipSide="above"
          onClick={() => goToPageOffset(1)}
        />
        <IconButton
          icon={Plus}
          label="New page"
          tooltipSide="above"
          onClick={addPageAfterCurrent}
        />
        <span className="floating-bar__divider" />
        <AspectToggle />
        <PaperMenu />
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
