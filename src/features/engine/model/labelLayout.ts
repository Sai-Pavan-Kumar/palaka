import { FONT_SIZE, LINE_HEIGHT } from './boardSpec'
import { getLineMidpoint } from './lineRouting'
import {
  getBaselineOffset,
  getFontCss,
  getTextLines,
  measureLine,
} from './textMetrics'
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
// A long name ("EC2 Image Builder") shrinks to fit the block instead of
// spilling over its outline, down to this size; past it, the teacher
// widens the block.
const BLOCK_LABEL_FIT_MIN_PX = 13
const BLOCK_LABEL_PAD = 10
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

function fitLabelPx(label: string, width: number, fontPx: number): number {
  const room = width - BLOCK_LABEL_PAD * 2
  const widest = Math.max(
    ...getTextLines(label).map((line) =>
      measureLine(line, getFontCss(fontFor('brand', fontPx))),
    ),
  )
  if (widest <= room || widest === 0) return fontPx
  return Math.max(BLOCK_LABEL_FIT_MIN_PX, (fontPx * room) / widest)
}

export function getBlockLabelLayout(block: BlockShape): LabelLayout {
  const fontPx = fitLabelPx(
    block.label,
    block.w,
    Math.min(
      BLOCK_LABEL_MAX_PX,
      Math.max(BLOCK_LABEL_MIN_PX, block.h * BLOCK_LABEL_SHARE),
    ),
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
  const mid = getLineMidpoint(line)
  return {
    ...fontFor('code', LINE_LABEL_PX),
    centreX: mid.x,
    top: mid.y - lineBox / 2,
    width: LINE_LABEL_WIDTH,
    fontPx: LINE_LABEL_PX,
  }
}

export function getLabelBaseline(layout: LabelLayout): number {
  return layout.top + getBaselineOffset(layout)
}
