import { ArrowLeftRight } from 'lucide-react'
import { IconButton } from '../../shared/ui/IconButton'
import { useEngineStore } from '../engine/engineStore'
import { getSelectedLines, setTwoWay } from '../engine/flowActions'
import { findPage } from '../engine/model/documentOps'
import { useSessionStore } from '../engine/sessionStore'

// Two-way links (request and answer, a WebSocket) need a head at each end.
export function ArrowHeadsToggle() {
  const doc = useEngineStore((s) => s.doc)
  const pageId = useSessionStore((s) => s.pageId)
  const selectedIds = useSessionStore((s) => s.selectedIds)
  const page = findPage(doc, pageId)
  const arrows = (page ? getSelectedLines(page, selectedIds) : []).filter(
    (line) => line.arrowhead || line.arrowStart,
  )
  if (arrows.length === 0) return null
  const isTwoWay = arrows.every((line) => line.arrowhead && line.arrowStart)
  return (
    <IconButton
      icon={ArrowLeftRight}
      label={
        isTwoWay
          ? 'Two-way arrow (click for one-way)'
          : 'One-way arrow (click for two-way)'
      }
      isActive={isTwoWay}
      onClick={() => setTwoWay(!isTwoWay)}
    />
  )
}
