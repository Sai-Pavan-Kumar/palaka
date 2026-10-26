import { useBoardPalette } from '../engine/render/paletteContext'
import { awsIconUrl, brandFill, isAwsIcon } from './iconLibrary'
import { useLibraryIcon } from './useLibraryIcon'

type Box = { x: number; y: number; size: number }

export function LibraryIconView({ id, box }: { id: string; box: Box }) {
  const palette = useBoardPalette()
  const icon = useLibraryIcon(id)
  if (!icon) return null
  const { x, y, size } = box
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
