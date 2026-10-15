import { useMemo, type ReactNode } from 'react'
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

function PageShapes({
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
        drawOn={drawOnStep !== null && shape.revealStep === drawOnStep}
        isFlowing={isFlowRunning(shape, flowUpTo)}
        highlighted={lit.columns.get(id)}
        rowStates={lit.rowStates.get(id)}
        isGlowing={lit.lines.has(id)}
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

// One page as an SVG the size of the slide: paper, shapes, brand mark. The
// live board and every export render through this, so a PNG always matches
// what the video showed.
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
}: PageSvgProps) {
  const { width, height } = SLIDE_SIZE[aspect]
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
        {paper.showBrand && <BrandMark palette={palette} />}
      </svg>
    </BoardPaletteContext>
  )
}
