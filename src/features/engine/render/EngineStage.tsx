import { useEffect, useRef, useState, type DragEvent } from 'react'
import { isShownAt } from '../../animate/motion'
import { CodeSimLayer } from '../../codesim/board/CodeSimLayer'
import { SimLayer } from '../../simulate/SimLayer'
import { BoardFrame } from '../../board/BoardFrame'
import { useBoardStore } from '../../board/boardStore'
import { useEngineStore } from '../engineStore'
import { SLIDE_SIZE } from '../model/boardSpec'
import { findPage } from '../model/documentOps'
import { getPalette } from '../model/paper'
import type { BoardDocument, Page, Shape } from '../model/types'
import { useSessionStore, type EngineTool } from '../sessionStore'
import { EditingOverlay } from './EditingOverlay'
import { LaserTrail } from './LaserTrail'
import { PageSvg } from './PageSvg'
import { TextEditor } from './TextEditor'
import { FacecamBubble } from '../../facecam/FacecamBubble'
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
    ? (shape: Shape) => isShownAt(shape, shownSteps, drawOnStep)
    : undefined
  return { isVisible, drawOnStep, flowUpTo: presenting ? shownSteps : null }
}

function stageClassName(
  doc: BoardDocument,
  tool: EngineTool,
  isWide: boolean,
  presenting: boolean,
): string {
  const orientation = doc.aspect === '9:16' ? 'is-portrait' : 'is-landscape'
  const paperTone = getPalette(doc.paper).tone === 'dark' ? 'is-dark-paper' : ''
  const wideClass = isWide ? 'is-wide' : ''
  const presentClass = presenting ? 'is-presenting' : ''
  return `board-stage ${orientation} ${wideClass} ${presentClass} tool-${tool} ${paperTone}`.trim()
}

type EngineStageProps = {
  onPress?: () => void
  onDragOver?: (event: DragEvent<HTMLDivElement>) => void
  onDrop?: (event: DragEvent<HTMLDivElement>) => void
}

type CameraTrackProps = {
  page: Page
  doc: BoardDocument
  imageUrls: Record<string, string>
  drawOnStep: number | null
  flowUpTo: number | null
  isVisible?: (shape: Shape) => boolean
  editingTextId: string | null
  presenting: boolean
  isWide: boolean
  activeFrame: number
  totalWorldWidth: number
  height: number
}

function BoardCameraTrack({
  page,
  doc,
  imageUrls,
  drawOnStep,
  flowUpTo,
  isVisible,
  editingTextId,
  presenting,
  isWide,
  activeFrame,
  totalWorldWidth,
  height,
}: CameraTrackProps) {
  const cameraStyle =
    presenting && isWide
      ? { transform: `translate3d(-${activeFrame * 50}%, 0, 0)` }
      : undefined

  return (
    <div
      className={`board__camera-track ${isWide ? 'is-wide' : ''}`}
      style={cameraStyle}
    >
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
        showFrameSeam={!presenting}
      />
      <svg
        className="board__canvas"
        viewBox={`0 0 ${totalWorldWidth} ${height}`}
      >
        <SimLayer page={page} paper={doc.paper} isVisible={isVisible} />
        <CodeSimLayer page={page} paper={doc.paper} isVisible={isVisible} />
        <LaserTrail />
      </svg>
    </div>
  )
}

function useStageLayout(
  page: Page,
  aspect: import('../model/types').Aspect,
  presenting: boolean,
  activeFrame: number,
) {
  const isWide = (page.frameCount ?? 1) > 1
  const { width: baseWidth, height } = SLIDE_SIZE[aspect]
  const totalWorldWidth = baseWidth * (page.frameCount ?? 1)
  const stageWidth = presenting ? baseWidth : totalWorldWidth
  const pointerOffsetX = presenting && isWide ? activeFrame * baseWidth : 0
  return { isWide, totalWorldWidth, stageWidth, pointerOffsetX, height }
}

function useEngineStageSession() {
  const pageId = useSessionStore((s) => s.pageId)
  const tool = useSessionStore((s) => s.tool)
  const presenting = useSessionStore((s) => s.presenting)
  const activeFrame = useSessionStore((s) => s.activeFrame)
  const editingTextId = useSessionStore((s) => s.editingTextId)
  return { pageId, tool, presenting, activeFrame, editingTextId }
}

type StageBoardFrameProps = {
  setBoardElement: (el: HTMLDivElement | null) => void
  session: ReturnType<typeof useEngineStageSession>
  page: Page
  doc: BoardDocument
  imageUrls: Record<string, string>
  drawOnStep: number | null
  flowUpTo: number | null
  isVisible?: (shape: Shape) => boolean
  layout: ReturnType<typeof useStageLayout>
}

function StageBoardFrame({
  setBoardElement,
  session,
  page,
  doc,
  imageUrls,
  drawOnStep,
  flowUpTo,
  isVisible,
  layout,
}: StageBoardFrameProps) {
  return (
    <BoardFrame ref={setBoardElement} isPresenting={session.presenting}>
      <BoardCameraTrack
        page={page}
        doc={doc}
        imageUrls={imageUrls}
        drawOnStep={drawOnStep}
        flowUpTo={flowUpTo}
        isVisible={isVisible}
        editingTextId={session.editingTextId}
        presenting={session.presenting}
        isWide={layout.isWide}
        activeFrame={session.activeFrame}
        totalWorldWidth={layout.totalWorldWidth}
        height={layout.height}
      />
      <TextEditor />
      <FacecamBubble />
    </BoardFrame>
  )
}

// Stage = recorded board + unrecorded overlay, stacked at the same size.
function useStagePointerSetup(
  stageWidth: number,
  pointerOffsetX: number,
  onPress?: () => void,
) {
  const stageRef = useRef<HTMLDivElement>(null)
  const shownWidth = useElementWidth(stageRef)
  const pointer = useBoardPointer(stageRef, stageWidth, pointerOffsetX, onPress)
  const unitsPerPixel = shownWidth > 0 ? stageWidth / shownWidth : 1
  return { stageRef, pointer, unitsPerPixel }
}

// Stage = recorded board + unrecorded overlay, stacked at the same size.
export function EngineStage({ onPress, onDragOver, onDrop }: EngineStageProps) {
  const doc = useEngineStore((s) => s.doc)
  const session = useEngineStageSession()
  const setBoardElement = useBoardStore((s) => s.setBoardElement)
  const { isVisible, drawOnStep, flowUpTo } = useRevealRules(session.pageId)
  const imageUrls = useImageUrls(doc.assets)
  const page = findPage(doc, session.pageId) ?? doc.pages[0]
  const layout = useStageLayout(
    page,
    doc.aspect,
    session.presenting,
    session.activeFrame,
  )
  const { stageRef, pointer, unitsPerPixel } = useStagePointerSetup(
    layout.stageWidth,
    layout.pointerOffsetX,
    onPress,
  )

  return (
    <div
      ref={stageRef}
      className={stageClassName(
        doc,
        session.tool,
        layout.isWide,
        session.presenting,
      )}
      {...pointer}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      <StageBoardFrame
        setBoardElement={setBoardElement}
        session={session}
        page={page}
        doc={doc}
        imageUrls={imageUrls}
        drawOnStep={drawOnStep}
        flowUpTo={flowUpTo}
        isVisible={isVisible}
        layout={layout}
      />
      <EditingOverlay
        width={layout.stageWidth}
        height={layout.height}
        unitsPerPixel={unitsPerPixel}
      />
    </div>
  )
}
