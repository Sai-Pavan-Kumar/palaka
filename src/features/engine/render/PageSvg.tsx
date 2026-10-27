import { useMemo, type ReactNode } from 'react'
import { motionAt } from '../../animate/motion'
import { getQueryFocus } from '../../sql/queryFocus'
import { isEffect } from '../model/effects'
import { getActiveHighlights } from '../model/highlights'
import { SLIDE_SIZE } from '../model/boardSpec'
import { getPalette } from '../model/paper'
import type { Aspect, Page, Paper, Shape } from '../model/types'
import { HatchPatterns } from './HatchPatterns'
import { BoardPaletteContext } from './paletteContext'
import { BrandMark, PaperBackground } from './PaperLayer'
import { ShapeView } from './ShapeView'
import { getShapeBounds } from '../model/geometry'
import { setSession, useSessionStore } from '../sessionStore'
import { SpotlightOverlay } from './SpotlightOverlay'

function isFlowRunning(shape: Shape, flowUpTo: number | null): boolean {
  if (flowUpTo === null || shape.type !== 'line' || !shape.flow) return false
  const { step } = shape.flow
  return step === undefined || step <= flowUpTo
}

type PageShapesProps = Pick<
  PageSvgProps,
  'page' | 'imageUrls' | 'isVisible' | 'hiddenShapeId'
> & { drawOnStep: number | null; flowUpTo: number | null }

export function PageShapes({
  page,
  imageUrls,
  isVisible,
  hiddenShapeId,
  drawOnStep,
  flowUpTo,
}: PageShapesProps) {
  const lit = useMemo(
    () => getActiveHighlights(page, flowUpTo),
    [page, flowUpTo],
  )
  const queryFocus = useMemo(
    () => getQueryFocus(page, flowUpTo),
    [page, flowUpTo],
  )
  return page.order.map((id) => {
    const shape = page.shapes[id]
    // Effects have no ink of their own; tables and arrows draw them.
    if (isEffect(shape)) return null
    if (isVisible && !isVisible(shape)) return null
    return (
      <ShapeView
        key={id}
        shape={shape}
        imageUrl={shape.type === 'image' ? imageUrls[shape.assetId] : undefined}
        isHidden={id === hiddenShapeId}
        motion={motionAt(shape, drawOnStep)}
        isFlowing={isFlowRunning(shape, flowUpTo)}
        highlighted={lit.columns.get(id)}
        rowStates={lit.rowStates.get(id)}
        isGlowing={lit.lines.has(id)}
        focusLine={queryFocus.get(id)}
      />
    )
  })
}

type PageSvgProps = {
  page: Page
  aspect: Aspect
  paper: Paper
  // Image asset id → URL the browser can show (object URL or data URL).
  imageUrls: Record<string, string>
  isVisible?: (shape: Shape) => boolean
  hiddenShapeId?: string | null
  // The reveal step that should draw itself in (live board only).
  drawOnStep?: number | null
  // Steps shown while presenting; flow dots up to here move. null = all
  // flow stands still (editing, exports).
  flowUpTo?: number | null
  className?: string
  // Exports add embedded fonts here.
  children?: ReactNode
  includeSpotlight?: boolean
  showFrameSeam?: boolean
}

function FrameSeamGuide({ width, height }: { width: number; height: number }) {
  const midX = width / 2
  return (
    <g className="frame-seam-guide" pointerEvents="none">
      <line
        x1={midX}
        y1={0}
        x2={midX}
        y2={height}
        stroke="currentColor"
        strokeDasharray="8 8"
        strokeWidth={2}
        opacity={0.25}
      />
      <text
        x={midX - 20}
        y={40}
        textAnchor="end"
        fill="currentColor"
        opacity={0.4}
        fontSize={16}
        fontWeight={600}
        fontFamily="sans-serif"
      >
        FRAME 1
      </text>
      <text
        x={midX + 20}
        y={40}
        textAnchor="start"
        fill="currentColor"
        opacity={0.4}
        fontSize={16}
        fontWeight={600}
        fontFamily="sans-serif"
      >
        FRAME 2
      </text>
    </g>
  )
}

function SpotlightLayer({
  page,
  width,
  height,
}: {
  page: Page
  width: number
  height: number
}) {
  const spotlightId = useSessionStore((s) => s.spotlightId)
  const target = spotlightId ? page.shapes[spotlightId] : undefined
  if (!target) return null
  return (
    <SpotlightOverlay
      bounds={getShapeBounds(target)}
      width={width}
      height={height}
      onDismiss={() => setSession({ spotlightId: null })}
    />
  )
}

type SvgContentProps = {
  children?: ReactNode
  paper: Paper
  palette: ReturnType<typeof getPalette>
  width: number
  height: number
  page: Page
  imageUrls: Record<string, string>
  isVisible?: (shape: Shape) => boolean
  hiddenShapeId?: string | null
  drawOnStep: number | null
  flowUpTo: number | null
  includeSpotlight: boolean
  showFrameSeam: boolean
  frameCount: number
}

function PageSvgContent({
  children,
  paper,
  palette,
  width,
  height,
  page,
  imageUrls,
  isVisible,
  hiddenShapeId,
  drawOnStep,
  flowUpTo,
  includeSpotlight,
  showFrameSeam,
  frameCount,
}: SvgContentProps) {
  return (
    <>
      {children}
      <PaperBackground
        paper={paper}
        palette={palette}
        width={width}
        height={height}
      />
      <HatchPatterns />
      <PageShapes
        page={page}
        imageUrls={imageUrls}
        isVisible={isVisible}
        hiddenShapeId={hiddenShapeId}
        drawOnStep={drawOnStep}
        flowUpTo={flowUpTo}
      />
      {includeSpotlight && (
        <SpotlightLayer page={page} width={width} height={height} />
      )}
      {showFrameSeam && frameCount > 1 && (
        <FrameSeamGuide width={width} height={height} />
      )}
      {paper.showBrand && <BrandMark palette={palette} />}
    </>
  )
}

// One page as an SVG the size of the slide: paper, shapes, brand mark.
export function PageSvg({
  page,
  aspect,
  paper,
  imageUrls,
  isVisible,
  hiddenShapeId,
  drawOnStep = null,
  flowUpTo = null,
  className,
  children,
  includeSpotlight = true,
  showFrameSeam = false,
}: PageSvgProps) {
  const baseSize = SLIDE_SIZE[aspect]
  const frameCount = page.frameCount ?? 1
  const width = baseSize.width * frameCount
  const height = baseSize.height
  const palette = getPalette(paper)
  return (
    <BoardPaletteContext value={palette}>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className={className}
        viewBox={`0 0 ${width} ${height}`}
        width={width}
        height={height}
      >
        <PageSvgContent
          paper={paper}
          palette={palette}
          width={width}
          height={height}
          page={page}
          imageUrls={imageUrls}
          isVisible={isVisible}
          hiddenShapeId={hiddenShapeId}
          drawOnStep={drawOnStep}
          flowUpTo={flowUpTo}
          includeSpotlight={includeSpotlight}
          showFrameSeam={showFrameSeam}
          frameCount={frameCount}
        >
          {children}
        </PageSvgContent>
      </svg>
    </BoardPaletteContext>
  )
}
