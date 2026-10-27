import { UpcomingGhosts } from '../../reveal/UpcomingGhosts'
import type { BoardDocument, Page } from '../model/types'
import { EditingOverlay } from './EditingOverlay'

type StageLayout = {
  pointerOffsetX: number
  stageWidth: number
  height: number
}

// Speaker-only layers: siblings of the recorded board, so a take never
// shows the faint "coming next" preview or the selection handles.
export function StageOverlays({
  page,
  doc,
  imageUrls,
  layout,
  unitsPerPixel,
}: {
  page: Page
  doc: BoardDocument
  imageUrls: Record<string, string>
  layout: StageLayout
  unitsPerPixel: number
}) {
  return (
    <>
      <UpcomingGhosts
        page={page}
        paper={doc.paper}
        imageUrls={imageUrls}
        offsetX={layout.pointerOffsetX}
        width={layout.stageWidth}
        height={layout.height}
      />
      <EditingOverlay
        width={layout.stageWidth}
        height={layout.height}
        unitsPerPixel={unitsPerPixel}
      />
    </>
  )
}
