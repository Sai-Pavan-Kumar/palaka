import { COLOR_KEYS, hatchPatternId } from '../model/boardSpec'
import { useBoardPalette } from './paletteContext'

// Spacing in slide pixels: dense enough to read as a fill, open enough to
// survive video compression without turning into a flat grey.
const HATCH_GAP = 18
const HATCH_WIDTH = 3

// One diagonal-line pattern per ink colour, defined once per board SVG, in
// the ink the current paper uses.
export function HatchPatterns() {
  const palette = useBoardPalette()
  return (
    <defs>
      {COLOR_KEYS.map((color) => (
        <pattern
          key={color}
          id={hatchPatternId(color)}
          patternUnits="userSpaceOnUse"
          width={HATCH_GAP}
          height={HATCH_GAP}
          patternTransform="rotate(45)"
        >
          <line
            x1={0}
            y1={0}
            x2={0}
            y2={HATCH_GAP}
            stroke={palette.ink[color]}
            strokeWidth={HATCH_WIDTH}
          />
        </pattern>
      ))}
    </defs>
  )
}
