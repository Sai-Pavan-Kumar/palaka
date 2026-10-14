import type { ReactNode } from 'react'
import { SLIDE_SIZE } from '../model/boardSpec'
import { getPalette } from '../model/paper'
import type { Aspect, Page, Paper, Shape } from '../model/types'
import { HatchPatterns } from './HatchPatterns'
import { BoardPaletteContext } from './paletteContext'
import { BrandMark, PaperBackground } from './PaperLayer'
import { ShapeView } from './ShapeView'

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
  className?: string
  // Exports add embedded fonts here.
  children?: ReactNode
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
  className,
  children,
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
        {page.order.map((id) => {
          const shape = page.shapes[id]
          if (isVisible && !isVisible(shape)) return null
          return (
            <ShapeView
              key={id}
              shape={shape}
              imageUrl={
                shape.type === 'image' ? imageUrls[shape.assetId] : undefined
              }
              isHidden={id === hiddenShapeId}
              drawOn={drawOnStep !== null && shape.revealStep === drawOnStep}
            />
          )
        })}
        {paper.showBrand && <BrandMark palette={palette} />}
      </svg>
    </BoardPaletteContext>
  )
}
