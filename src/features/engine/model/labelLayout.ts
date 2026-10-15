import { FONT_SIZE, LINE_HEIGHT } from './boardSpec'
import { getBaselineOffset } from './textMetrics'
import type { BlockShape, FontKey, LineShape, SizeKey } from './types'

// Labels reuse the text metrics, so the SVG label and the textarea that
// edits it put every glyph on the same pixel.
export type LabelFont = { font: FontKey; size: SizeKey; scale: number }

export type LabelLayout = LabelFont & {
  centreX: number
  // Top of the first line box.
  top: number
  // Room the editor gets; the drawn label is centred on centreX anyway.
  width: number
  fontPx: number
}

const BLOCK_LABEL_MIN_PX = 20
const BLOCK_LABEL_MAX_PX = 34
const BLOCK_LABEL_SHARE = 0.16
const BLOCK_ICON_SHARE = 0.4
const BLOCK_ICON_MAX = 64
// Icon centre and label line, as a share of the block height.
const BLOCK_ICON_CENTRE_Y = 0.4
const BLOCK_LABEL_CENTRE_Y = 0.76
const LINE_LABEL_PX = 26
const LINE_LABEL_WIDTH = 360

function fontFor(font: FontKey, fontPx: number): LabelFont {
  return { font, size: 's', scale: fontPx / FONT_SIZE.s }
}

export function getBlockIconBox(block: BlockShape) {
  const size = Math.min(
    Math.min(block.w, block.h) * BLOCK_ICON_SHARE,
    BLOCK_ICON_MAX,
  )
  return {
    x: block.x + block.w / 2 - size / 2,
    y: block.y + block.h * BLOCK_ICON_CENTRE_Y - size / 2,
    size,
  }
}

export function getBlockLabelLayout(block: BlockShape): LabelLayout {
  const fontPx = Math.min(
    BLOCK_LABEL_MAX_PX,
    Math.max(BLOCK_LABEL_MIN_PX, block.h * BLOCK_LABEL_SHARE),
  )
  const lineBox = fontPx * LINE_HEIGHT
  return {
    ...fontFor('brand', fontPx),
    centreX: block.x + block.w / 2,
    top: block.y + block.h * BLOCK_LABEL_CENTRE_Y - lineBox / 2,
    width: block.w,
    fontPx,
  }
}

export function getLineLabelLayout(line: LineShape): LabelLayout {
  const lineBox = LINE_LABEL_PX * LINE_HEIGHT
  return {
    ...fontFor('code', LINE_LABEL_PX),
    centreX: (line.x1 + line.x2) / 2,
    top: (line.y1 + line.y2) / 2 - lineBox / 2,
    width: LINE_LABEL_WIDTH,
    fontPx: LINE_LABEL_PX,
  }
}

export function getLabelBaseline(layout: LabelLayout): number {
  return layout.top + getBaselineOffset(layout)
}
