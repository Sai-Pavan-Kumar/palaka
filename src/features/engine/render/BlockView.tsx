import { FONT_FAMILY, FONT_WEIGHT } from '../model/boardSpec'
import {
  getBlockIconBox,
  getBlockLabelLayout,
  getLabelBaseline,
} from '../model/labelLayout'
import type { BlockShape } from '../model/types'
import { BlockEffectView } from './BlockEffectView'
import { BLOCK_ICONS } from './blockIcons'
import { LibraryIconView } from '../../icons/LibraryIconView'
import { useLibraryIcon } from '../../icons/useLibraryIcon'
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
  const icon = getBlockIconBox(shape)
  const label = getBlockLabelLayout(shape)
  return (
    <>
      <BlockIcon shape={shape} box={icon} color={color} />
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

// A library icon once its pack has loaded; the kind's line icon until then
// (and for blocks that never picked one).
function BlockIcon({
  shape,
  box,
  color,
}: {
  shape: BlockShape
  box: { x: number; y: number; size: number }
  color: string
}) {
  const libraryIcon = useLibraryIcon(shape.icon)
  if (libraryIcon && shape.icon) {
    return <LibraryIconView id={shape.icon} box={box} />
  }
  const Icon = BLOCK_ICONS[shape.kind]
  return (
    <Icon
      x={box.x}
      y={box.y}
      size={box.size}
      color={color}
      strokeWidth={ICON_STROKE}
      aria-hidden
    />
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
