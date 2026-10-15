import {
  Camera,
  ChevronLeft,
  ChevronRight,
  Columns2,
  NotebookPen,
  Plus,
  RectangleHorizontal,
  RectangleVertical,
  Trash2,
} from 'lucide-react'
import { IconButton } from '../../shared/ui/IconButton'
import { Popover } from '../../shared/ui/Popover'
import { useEngineStore } from '../engine/engineStore'
import { setCameraFrame, useSessionStore } from '../engine/sessionStore'
import { PaperMenu } from '../paper/PaperMenu'
import { StepCounter } from '../reveal/StepCounter'
import { useUiStore } from '../shell/uiStore'
import {
  addPageAfterCurrent,
  deleteCurrentPage,
  goToPageOffset,
  setAspect,
  switchToPage,
  togglePageFrameCount,
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

function WidePageToggle() {
  const currentId = useSessionStore((s) => s.pageId)
  const page = useEngineStore((s) =>
    s.doc.pages.find((p) => p.id === currentId),
  )
  const isWide = page?.frameCount === 2
  return (
    <IconButton
      icon={Columns2}
      label={
        isWide
          ? 'Wide 2x sequence page (click for standard 1x)'
          : 'Standard 1x page (click for wide 2x sequence)'
      }
      isActive={isWide}
      tooltipSide="above"
      onClick={() => togglePageFrameCount(currentId)}
    />
  )
}

function CameraGlidePill() {
  const presenting = useSessionStore((s) => s.presenting)
  const currentId = useSessionStore((s) => s.pageId)
  const activeFrame = useSessionStore((s) => s.activeFrame)
  const page = useEngineStore((s) =>
    s.doc.pages.find((p) => p.id === currentId),
  )
  if (!presenting || page?.frameCount !== 2) return null

  return (
    <div className="camera-glide-pill" role="group" aria-label="Camera Frame">
      <Camera size={14} strokeWidth={2} className="camera-glide-pill__icon" />
      <button
        type="button"
        className={`camera-glide-pill__btn ${activeFrame === 0 ? 'is-active' : ''}`}
        onClick={() => setCameraFrame(0)}
        title="Glide to Frame 1 (Shift+Left)"
      >
        Frame 1
      </button>
      <button
        type="button"
        className={`camera-glide-pill__btn ${activeFrame === 1 ? 'is-active' : ''}`}
        onClick={() => setCameraFrame(1)}
        title="Glide to Frame 2 (Tab or Shift+Right)"
      >
        Frame 2
      </button>
    </div>
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
        <WidePageToggle />
        <PaperMenu />
        <IconButton
          icon={NotebookPen}
          label="Script notes (private)"
          tooltipSide="above"
          isActive={isNotesOpen}
          onClick={toggleNotes}
        />
      </div>
      <CameraGlidePill />
      <StepCounter />
    </footer>
  )
}
