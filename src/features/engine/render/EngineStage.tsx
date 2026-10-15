import { useEffect, useRef, useState, type DragEvent } from 'react'
import { BoardFrame } from '../../board/BoardFrame'
import { useBoardStore } from '../../board/boardStore'
import { useEngineStore } from '../engineStore'
import { SLIDE_SIZE } from '../model/boardSpec'
import { findPage } from '../model/documentOps'
import { getPalette } from '../model/paper'
import type { BoardDocument, Shape } from '../model/types'
import { useSessionStore, type EngineTool } from '../sessionStore'
import { EditingOverlay } from './EditingOverlay'
import { LaserTrail } from './LaserTrail'
import { PageSvg } from './PageSvg'
import { TextEditor } from './TextEditor'
import { useBoardPointer } from './useBoardPointer'
import { useImageUrls } from './useImageUrls'

function useElementWidth(ref: React.RefObject<HTMLElement | null>): number {
  const [width, setWidth] = useState(0)
  useEffect(() => {
    const element = ref.current
    if (!element) return
    const observer = new ResizeObserver(([entry]) =>
      setWidth(entry.contentRect.width),
    )
    observer.observe(element)
    return () => observer.disconnect()
  }, [ref])
  return width
}

// Hidden reveal steps are not rendered at all, so they can't be clicked
// either, and a step that appears mounts fresh and fades in once.
// Also reports which step should draw itself in on this page.
function useRevealRules(pageId: string) {
  const presenting = useSessionStore((s) => s.presenting)
  const shownSteps = useSessionStore((s) => s.revealedUpTo[pageId] ?? 0)
  const drawOnStep = useSessionStore((s) =>
    s.drawOnStep?.pageId === pageId ? s.drawOnStep.step : null,
  )
  const isVisible = presenting
    ? (shape: Shape) =>
        shape.revealStep === undefined || shape.revealStep <= shownSteps
    : undefined
  return { isVisible, drawOnStep, flowUpTo: presenting ? shownSteps : null }
}

function stageClassName(doc: BoardDocument, tool: EngineTool): string {
  const orientation = doc.aspect === '9:16' ? 'is-portrait' : 'is-landscape'
  const paperTone = getPalette(doc.paper).tone === 'dark' ? 'is-dark-paper' : ''
  return `board-stage ${orientation} tool-${tool} ${paperTone}`
}

type EngineStageProps = {
  onPress?: () => void
  onDragOver?: (event: DragEvent<HTMLDivElement>) => void
  onDrop?: (event: DragEvent<HTMLDivElement>) => void
}

// Stage = recorded board + unrecorded overlay, stacked at the same size.
// The SVG viewBox is the slide itself, so the browser does all the scaling.
export function EngineStage({ onPress, onDragOver, onDrop }: EngineStageProps) {
  const doc = useEngineStore((s) => s.doc)
  const pageId = useSessionStore((s) => s.pageId)
  const tool = useSessionStore((s) => s.tool)
  const presenting = useSessionStore((s) => s.presenting)
  const editingTextId = useSessionStore((s) => s.editingTextId)
  const setBoardElement = useBoardStore((s) => s.setBoardElement)
  const { isVisible, drawOnStep, flowUpTo } = useRevealRules(pageId)
  const imageUrls = useImageUrls(doc.assets)
  const { width, height } = SLIDE_SIZE[doc.aspect]
  const stageRef = useRef<HTMLDivElement>(null)
  const shownWidth = useElementWidth(stageRef)
  const pointer = useBoardPointer(stageRef, width, onPress)
  const page = findPage(doc, pageId) ?? doc.pages[0]

  return (
    <div
      ref={stageRef}
      className={stageClassName(doc, tool)}
      {...pointer}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      <BoardFrame ref={setBoardElement} isPresenting={presenting}>
        <PageSvg
          key={page.id}
          className="board__canvas"
          page={page}
          aspect={doc.aspect}
          paper={doc.paper}
          imageUrls={imageUrls}
          drawOnStep={drawOnStep}
          flowUpTo={flowUpTo}
          isVisible={isVisible}
          hiddenShapeId={editingTextId}
        />
        <svg className="board__canvas" viewBox={`0 0 ${width} ${height}`}>
          <LaserTrail />
        </svg>
        <TextEditor />
      </BoardFrame>
      <EditingOverlay
        width={width}
        height={height}
        unitsPerPixel={shownWidth > 0 ? width / shownWidth : 1}
      />
    </div>
  )
}
