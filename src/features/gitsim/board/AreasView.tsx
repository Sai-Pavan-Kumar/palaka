import { FONT_FAMILY } from '../../engine/model/boardSpec'
import type { BoardPalette } from '../../engine/model/paper'
import { workingAreas } from '../engine/commands/status'
import type { GitState } from '../engine/types'
import { CHAR_WIDTH, charsThatFit, clip } from './fitText'

type Chip = { path: string; tag: string; color: string }

const MAX_CHIPS = 3
const CHIP_H = 30
const CHIP_GAP = 8

function workChips(state: GitState, palette: BoardPalette): Chip[] {
  const conflicts = new Set(state.op?.conflicts ?? [])
  const { unstaged, untracked } = workingAreas(state)
  return [
    ...[...conflicts].map((path) => ({
      path,
      tag: 'conflict',
      color: palette.ink.red,
    })),
    ...unstaged
      .filter(([path]) => !conflicts.has(path))
      .map(([path, kind]) => ({
        path,
        tag: kind === 'deleted' ? 'deleted' : 'modified',
        color: palette.ink.blue,
      })),
    ...untracked
      .filter((path) => !conflicts.has(path))
      .map((path) => ({ path, tag: 'untracked', color: palette.ink.orange })),
  ]
}

function stagedChips(state: GitState, palette: BoardPalette): Chip[] {
  return workingAreas(state).staged.map(([path, kind]) => ({
    path,
    tag: kind === 'new file' ? 'new' : kind,
    color: palette.ink.green,
  }))
}

function stashChips(state: GitState, palette: BoardPalette): Chip[] {
  return state.stash.map((entry, i) => ({
    path: `stash@{${i}}`,
    tag: entry.label,
    color: palette.ink.violet,
  }))
}

// The tag (modified, untracked) keeps its place at the right; the path
// gets whatever room is left.
function pathChars(width: number, tag: string): number {
  const tagWidth = tag.length * 16 * CHAR_WIDTH.code + 40
  return charsThatFit(width - tagWidth - 16, 18, CHAR_WIDTH.code)
}

function ChipRow({
  chip,
  x,
  y,
  width,
  palette,
}: {
  chip: Chip
  x: number
  y: number
  width: number
  palette: BoardPalette
}) {
  return (
    <g className="gitsim-type" transform={`translate(${x}, ${y})`}>
      <rect
        width={width}
        height={CHIP_H}
        rx={8}
        fill={chip.color}
        opacity={0.12}
      />
      <rect width={6} height={CHIP_H} rx={3} fill={chip.color} />
      <text x={16} y={21} fontSize={18} fill={palette.ink.black}>
        {clip(chip.path, pathChars(width, chip.tag))}
      </text>
      <text
        x={width - 12}
        y={21}
        fontSize={16}
        textAnchor="end"
        fill={chip.color}
      >
        {chip.tag}
      </text>
    </g>
  )
}

function Faint(props: {
  x: number
  y: number
  text: string
  palette: BoardPalette
  end?: boolean
}) {
  return (
    <text
      x={props.x}
      y={props.y}
      fontSize={17}
      textAnchor={props.end ? 'end' : 'start'}
      fill={props.palette.ink.black}
      opacity={0.45}
    >
      {props.text}
    </text>
  )
}

function Column({
  title,
  chips,
  x,
  y,
  width,
  palette,
}: {
  title: string
  chips: Chip[]
  x: number
  y: number
  width: number
  palette: BoardPalette
}) {
  const shown = chips.slice(0, MAX_CHIPS)
  const more = chips.length - shown.length
  return (
    <g fontFamily={FONT_FAMILY.code}>
      <text x={x} y={y} fontSize={20} fill={palette.ink.black} opacity={0.6}>
        {title}
      </text>
      {chips.length === 0 && (
        <Faint x={x} y={y + 38} palette={palette} text="(empty)" />
      )}
      {shown.map((chip, i) => (
        <ChipRow
          key={chip.path}
          chip={chip}
          x={x}
          y={y + 16 + i * (CHIP_H + CHIP_GAP)}
          width={width}
          palette={palette}
        />
      ))}
      {more > 0 && (
        <Faint
          x={x + width}
          y={y}
          palette={palette}
          text={`+${more} more`}
          end
        />
      )}
    </g>
  )
}

// The three places a change can live before it is a commit. Seeing a file
// hop from column to column is the whole lesson of `git add`.
export function AreasView({
  state,
  left,
  right,
  top,
  palette,
}: {
  state: GitState
  left: number
  right: number
  top: number
  palette: BoardPalette
}) {
  if (!state.initialized) return null
  const gap = 40
  const width = (right - left - gap * 2) / 3
  const columns = [
    { title: 'Working directory', chips: workChips(state, palette) },
    { title: 'Staging area', chips: stagedChips(state, palette) },
    { title: 'Stash', chips: stashChips(state, palette) },
  ]
  return (
    <g>
      {columns.map((column, i) => (
        <Column
          key={column.title}
          {...column}
          x={left + i * (width + gap)}
          y={top}
          width={width}
          palette={palette}
        />
      ))}
    </g>
  )
}
