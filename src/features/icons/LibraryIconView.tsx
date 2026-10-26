import { useBoardPalette } from '../engine/render/paletteContext'
import {
  awsIconUrl,
  brandFill,
  isAwsIcon,
  isRealWorldIcon,
} from './iconLibrary'
import { useLibraryIcon } from './useLibraryIcon'

type Box = { x: number; y: number; size: number }

// Line icons match the block's ink (and its solid-fill contrast colour),
// so a "Chef" block looks like the built-in "Service" block beside it.
export function LibraryIconView({
  id,
  box,
  color,
}: {
  id: string
  box: Box
  color: string
}) {
  const palette = useBoardPalette()
  const icon = useLibraryIcon(id)
  if (!icon) return null
  const { x, y, size } = box
  if (isRealWorldIcon(icon)) {
    const { Icon } = icon
    return (
      <Icon
        x={x}
        y={y}
        size={size}
        color={color}
        strokeWidth={1.75}
        aria-hidden
      />
    )
  }
  if (isAwsIcon(icon)) {
    return (
      <image
        href={awsIconUrl(icon)}
        x={x}
        y={y}
        width={size}
        height={size}
        aria-hidden
      />
    )
  }
  return (
    <svg x={x} y={y} width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <path
        d={icon.path}
        fill={brandFill(icon.hex, palette.tone, palette.ink.black)}
      />
    </svg>
  )
}
