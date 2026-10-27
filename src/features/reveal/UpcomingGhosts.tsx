import { isUpcoming } from '../animate/motion'
import { getPalette } from '../engine/model/paper'
import type { Page, Paper, Shape } from '../engine/model/types'
import { HatchPatterns } from '../engine/render/HatchPatterns'
import { PageShapes } from '../engine/render/PageSvg'
import { BoardPaletteContext } from '../engine/render/paletteContext'
import { useSessionStore } from '../engine/sessionStore'
import { useUiStore } from '../shell/uiStore'

// How strongly the speaker sees what is still to come. Faint enough to
// tell apart from what the audience already sees.
const GHOST_OPACITY = 0.2

const NO_IMAGES: Record<string, string> = {}

// The capture rule: this layer is a sibling of the recorded board, never a
// child, so Element Capture leaves it out. The speaker sees where the next
// objects will land; the video shows a clean board.
export function UpcomingGhosts({
  page,
  paper,
  imageUrls = NO_IMAGES,
  offsetX,
  width,
  height,
}: {
  page: Page
  paper: Paper
  imageUrls?: Record<string, string>
  offsetX: number
  width: number
  height: number
}) {
  const presenting = useSessionStore((s) => s.presenting)
  const shown = useSessionStore((s) => s.revealedUpTo[page.id] ?? 0)
  const showUpcoming = useUiStore((s) => s.showUpcoming)
  if (!presenting || !showUpcoming) return null
  const upcoming = (shape: Shape) => isUpcoming(shape, shown)
  if (!page.order.some((id) => upcoming(page.shapes[id]))) return null

  return (
    <BoardPaletteContext value={getPalette(paper)}>
      <svg
        className="upcoming-ghosts"
        viewBox={`${offsetX} 0 ${width} ${height}`}
        aria-hidden
      >
        <HatchPatterns />
        <g opacity={GHOST_OPACITY}>
          <PageShapes
            page={page}
            imageUrls={imageUrls}
            isVisible={upcoming}
            drawOnStep={null}
            flowUpTo={null}
          />
        </g>
      </svg>
    </BoardPaletteContext>
  )
}
