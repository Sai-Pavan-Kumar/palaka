import { FONT_FAMILY, FONT_WEIGHT, LINE_HEIGHT } from '../model/boardSpec'
import {
  getBaselineOffset,
  getFontPx,
  getShapeLines,
} from '../model/textMetrics'
import type { TextShape } from '../model/types'
import { useBoardPalette } from './paletteContext'

// Baselines follow CSS line layout, the same way the text editor (a textarea
// with the same line height) places them, so text does not jump when
// editing ends.
export function TextView({
  shape,
  focusLine,
}: {
  shape: TextShape
  // A query card while presenting: the clause running right now.
  focusLine?: number
}) {
  const palette = useBoardPalette()
  const fontPx = getFontPx(shape)
  const lineBox = fontPx * LINE_HEIGHT
  const baseline = getBaselineOffset(shape)
  const lines = getShapeLines(shape)
  const hasFocus = focusLine !== undefined
  return (
    <>
      {hasFocus && (
        <QueryLineBand
          shape={shape}
          line={focusLine}
          lineBox={lineBox}
          width={Math.max(...lines.map((l) => l.length)) * fontPx * MONO_EM}
          color={palette.ink[shape.color]}
        />
      )}
      <text
        fill={palette.ink[shape.color]}
        fontFamily={FONT_FAMILY[shape.font]}
        fontWeight={FONT_WEIGHT[shape.font]}
        fontSize={fontPx}
        style={{ whiteSpace: 'pre' }}
      >
        {lines.map((line, index) => (
          <tspan
            key={index}
            className={hasFocus ? 'query-line' : undefined}
            fillOpacity={hasFocus && index !== focusLine ? 0.35 : undefined}
            x={shape.x}
            y={shape.y + index * lineBox + baseline}
          >
            {line || ' '}
          </tspan>
        ))}
      </text>
    </>
  )
}

// Geist Mono glyphs are about 0.6em wide; close enough to size a band.
const MONO_EM = 0.6
const BAND_PAD = 6

// A soft marker band that glides to the running clause, so the eye finds
// the line being explained before the rows react.
function QueryLineBand({
  shape,
  line,
  lineBox,
  width,
  color,
}: {
  shape: TextShape
  line: number
  lineBox: number
  width: number
  color: string
}) {
  return (
    <rect
      className="query-line-band"
      x={shape.x - BAND_PAD}
      y={shape.y}
      width={width + BAND_PAD * 2}
      height={lineBox}
      rx={4}
      fill={color}
      fillOpacity={0.1}
      style={{ transform: `translateY(${line * lineBox}px)` }}
    />
  )
}
