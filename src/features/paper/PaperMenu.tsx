import { Palette } from 'lucide-react'
import { IconButton } from '../../shared/ui/IconButton'
import { Popover } from '../../shared/ui/Popover'
import { useEngineStore } from '../engine/engineStore'
import { getPalette, PAPER_COLORS, PAPER_PATTERNS } from '../engine/model/paper'
import type { Paper, PaperColor } from '../engine/model/types'
import { PaperBackground } from '../engine/render/PaperLayer'
import { setPaper } from '../pages/pageActions'
import './paper.css'

// Big enough to show a few cells of the pattern at its real density.
const PREVIEW_WIDTH = 240
const PREVIEW_HEIGHT = 150

// A real piece of the paper, drawn by the same code as the board, so what
// you pick is exactly what you get.
function PaperPreview({ paper }: { paper: Paper }) {
  return (
    <svg viewBox={`0 0 ${PREVIEW_WIDTH} ${PREVIEW_HEIGHT}`} aria-hidden>
      <PaperBackground
        paper={paper}
        palette={getPalette(paper)}
        width={PREVIEW_WIDTH}
        height={PREVIEW_HEIGHT}
        patternId={`paper-preview-${paper.pattern}`}
      />
    </svg>
  )
}

function PatternChoices({ paper }: { paper: Paper }) {
  return (
    <div className="paper-menu__patterns">
      {PAPER_PATTERNS.map(({ value, label }) => (
        <button
          key={value}
          type="button"
          className={`paper-menu__pattern ${paper.pattern === value ? 'is-active' : ''}`}
          aria-pressed={paper.pattern === value}
          onClick={() => setPaper({ pattern: value })}
        >
          <PaperPreview paper={{ ...paper, pattern: value }} />
          {label}
        </button>
      ))}
    </div>
  )
}

function ColorChoices({ paper }: { paper: Paper }) {
  const colors = Object.entries(PAPER_COLORS) as [
    PaperColor,
    (typeof PAPER_COLORS)[PaperColor],
  ][]
  return (
    <div className="paper-menu__colors">
      {colors.map(([value, { fill, label }]) => (
        <button
          key={value}
          type="button"
          className={`paper-menu__color ${paper.color === value ? 'is-active' : ''}`}
          style={{ background: fill }}
          aria-label={`${label} paper`}
          aria-pressed={paper.color === value}
          title={label}
          onClick={() => setPaper({ color: value })}
        />
      ))}
    </div>
  )
}

// Board paper: pattern, colour, and the brand mark. Lives in the page bar
// because it shapes every page, not one object.
export function PaperMenu() {
  const paper = useEngineStore((s) => s.doc.paper)
  return (
    <Popover
      side="above"
      align="end"
      trigger={({ toggle }) => (
        <IconButton
          icon={Palette}
          label="Paper: pattern and colour"
          tooltipSide="above"
          onClick={toggle}
        />
      )}
    >
      {() => (
        <div className="paper-menu">
          <p className="menu-label">Paper</p>
          <PatternChoices paper={paper} />
          <p className="menu-label">Colour</p>
          <ColorChoices paper={paper} />
          <p className="menu-label">Brand</p>
          <button
            type="button"
            className={`chip paper-menu__brand ${paper.showBrand ? 'is-active' : ''}`}
            aria-pressed={paper.showBrand}
            onClick={() => setPaper({ showBrand: !paper.showBrand })}
          >
            The SurfBoard mark {paper.showBrand ? 'on' : 'off'}
          </button>
        </div>
      )}
    </Popover>
  )
}
