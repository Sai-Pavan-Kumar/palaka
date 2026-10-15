import { FONT_FAMILY, FONT_WEIGHT } from '../model/boardSpec'
import {
  getBlockIconBox,
  getBlockLabelLayout,
  getLabelBaseline,
} from '../model/labelLayout'
import type { BlockShape } from '../model/types'
import { BlockEffectView } from './BlockEffectView'
import { BLOCK_ICONS } from './blockIcons'
import { GeoView } from './GeoLineViews'
import { useBoardPalette } from './paletteContext'

// Icon strokes in the icon's own 24-unit grid; a touch lighter than lucide's
// default so a big icon does not shout over the label.
const ICON_STROKE = 1.75

// Icon and label. Split out so the draw-on reveal can fade them in after
// the outline has been traced.
export function BlockContents({
  shape,
  hideLabel = false,
}: {
  shape: BlockShape
  hideLabel?: boolean
}) {
  const palette = useBoardPalette()
  const color =
    shape.fill === 'solid' ? palette.onSolid : palette.ink[shape.color]
  const Icon = BLOCK_ICONS[shape.kind]
  const icon = getBlockIconBox(shape)
  const label = getBlockLabelLayout(shape)
  return (
    <>
      <Icon
        x={icon.x}
        y={icon.y}
        size={icon.size}
        color={color}
        strokeWidth={ICON_STROKE}
        aria-hidden
      />
      {!hideLabel && shape.label && (
        <text
          x={label.centreX}
          y={getLabelBaseline(label)}
          textAnchor="middle"
          fill={color}
          fontFamily={FONT_FAMILY[label.font]}
          fontWeight={FONT_WEIGHT[label.font]}
          fontSize={label.fontPx}
          style={{ whiteSpace: 'pre' }}
        >
          {shape.label}
        </text>
      )}
    </>
  )
}

export function BlockView({
  shape,
  hideLabel,
}: {
  shape: BlockShape
  hideLabel?: boolean
}) {
  return (
    <>
      <GeoView shape={shape} />
      <BlockEffectView shape={shape} />
      <BlockContents shape={shape} hideLabel={hideLabel} />
    </>
  )
}
