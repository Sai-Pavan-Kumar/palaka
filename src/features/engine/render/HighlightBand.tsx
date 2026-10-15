import { HIGHLIGHT_OPACITY } from '../model/boardSpec'

// The marker-pen band a highlight step lays over a row or a column. It fades
// in (opacity only), so it is calm on video and instant with reduced motion.
export function HighlightBand({
  x,
  y,
  w,
  h,
  color,
}: {
  x: number
  y: number
  w: number
  h: number
  color: string
}) {
  return (
    <rect
      className="table-highlight"
      x={x}
      y={y}
      width={w}
      height={h}
      fill={color}
      fillOpacity={HIGHLIGHT_OPACITY}
    />
  )
}
