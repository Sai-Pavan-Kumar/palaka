import type { CSSProperties, ReactNode } from 'react'
import type { BoardPalette } from '../../engine/model/paper'
import type { ColorKey } from '../../engine/model/types'
import {
  pointerRows,
  type ArrayCell,
  type ArrayGeometry,
  type ArrayModel,
  type ArrayPointer,
} from './arrayModel'
import { codeFontCss } from './panelLayout'

// Each pointer keeps one colour for the whole run, so "lo" stays blue
// while the viewer tracks it across steps.
const POINTER_COLORS: ColorKey[] = ['blue', 'green', 'orange', 'violet', 'red']

// The value sits in its own group so a swap can fly it in from the other
// cell (CSS vars feed the keyframes) without moving the box itself.
function CellValue({
  cell,
  index,
  geo,
  palette,
}: {
  cell: ArrayCell
  index: number
  geo: ArrayGeometry
  palette: BoardPalette
}) {
  const swapStyle =
    cell.swapFrom === undefined
      ? undefined
      : ({
          '--from-x': `${(cell.swapFrom - index) * geo.cell}px`,
          // The two values arc past each other instead of colliding.
          '--lift': `${(cell.swapFrom > index ? -1 : 1) * geo.cell * 0.55}px`,
        } as CSSProperties)
  return (
    <g className={swapStyle ? 'codesim-swap' : undefined} style={swapStyle}>
      <text
        x={index * geo.cell + geo.cell / 2}
        y={geo.cell / 2}
        textAnchor="middle"
        dominantBaseline="central"
        fill={palette.ink.black}
        style={{ font: codeFontCss(geo.fontPx) }}
      >
        {cell.text}
      </text>
    </g>
  )
}

function MutedText({
  x,
  y,
  size,
  palette,
  children,
  anchor = 'start',
}: {
  x: number
  y: number
  size: number
  palette: BoardPalette
  children: ReactNode
  anchor?: 'start' | 'middle'
}) {
  return (
    <text
      x={x}
      y={y}
      textAnchor={anchor}
      dominantBaseline="central"
      fill={palette.ink.black}
      fillOpacity={0.5}
      style={{ font: codeFontCss(size) }}
    >
      {children}
    </text>
  )
}

function CellFrame({
  x,
  size,
  flashKey,
  palette,
}: {
  x: number
  size: number
  // The step that wrote this cell, so the flash replays on every write.
  flashKey: number | null
  palette: BoardPalette
}) {
  return (
    <>
      {flashKey !== null && (
        <rect
          key={flashKey}
          className="codesim-flash"
          x={x}
          width={size}
          height={size}
          fill={palette.highlight.orange}
        />
      )}
      <rect
        x={x}
        width={size}
        height={size}
        fill="none"
        stroke={palette.ink.black}
        strokeOpacity={0.45}
        strokeWidth={2}
      />
    </>
  )
}

function CellBox({
  cell,
  index,
  geo,
  palette,
  stepIndex,
}: {
  cell: ArrayCell
  index: number
  geo: ArrayGeometry
  palette: BoardPalette
  stepIndex: number
}) {
  const x = index * geo.cell
  return (
    <g className="codesim-cell" style={{ opacity: cell.dim ? 0.28 : 1 }}>
      <CellFrame
        x={x}
        size={geo.cell}
        flashKey={cell.changed ? stepIndex : null}
        palette={palette}
      />
      <CellValue
        key={`value-${stepIndex}`}
        cell={cell}
        index={index}
        geo={geo}
        palette={palette}
      />
      <MutedText
        x={x + geo.cell / 2}
        y={-geo.fontPx * 0.6}
        size={geo.fontPx * 0.65}
        palette={palette}
        anchor="middle"
      >
        {index}
      </MutedText>
    </g>
  )
}

function PointerTag({
  pointer,
  row,
  color,
  geo,
}: {
  pointer: ArrayPointer
  row: number
  color: string
  geo: ArrayGeometry
}) {
  const x = pointer.index * geo.cell + geo.cell / 2
  const y = geo.cell + geo.fontPx * 0.3 + row * geo.tagH
  const tip = geo.fontPx * 0.32
  return (
    // Keyed by name and moved with a CSS transform: the tag glides to its
    // new cell, which is what makes "lo moves right" readable on video.
    <g
      className="codesim-pointer"
      style={{ transform: `translate(${x}px, ${y}px)` }}
    >
      <path
        d={`M0 0 L${tip} ${tip * 1.3} L${-tip} ${tip * 1.3} Z`}
        fill={color}
      />
      <text
        y={tip * 1.3 + geo.fontPx * 0.95}
        textAnchor="middle"
        fill={color}
        style={{ font: codeFontCss(geo.fontPx * 0.8), fontWeight: 600 }}
      >
        {pointer.name}
      </text>
    </g>
  )
}

function PointerTags({
  pointers,
  geo,
  palette,
}: {
  pointers: ArrayPointer[]
  geo: ArrayGeometry
  palette: BoardPalette
}) {
  const rows = pointerRows(pointers)
  return pointers.map((pointer, order) => (
    <PointerTag
      key={pointer.name}
      pointer={pointer}
      row={rows.get(pointer.name) ?? 0}
      color={palette.ink[POINTER_COLORS[order % POINTER_COLORS.length]]}
      geo={geo}
    />
  ))
}

function moreAt(model: ArrayModel, geo: ArrayGeometry) {
  return {
    x: model.cells.length * geo.cell + geo.fontPx * 0.5,
    y: geo.cell / 2,
    size: geo.fontPx * 0.8,
  }
}

export function ArrayView({
  model,
  x,
  y,
  geo,
  palette,
  stepIndex,
}: {
  model: ArrayModel
  x: number
  y: number
  geo: ArrayGeometry
  palette: BoardPalette
  stepIndex: number
}) {
  const hidden = model.total - model.cells.length
  return (
    <g transform={`translate(${x} ${y})`}>
      <MutedText
        x={0}
        y={geo.fontPx * 0.6}
        size={geo.fontPx * 0.85}
        palette={palette}
      >
        {model.name}
      </MutedText>
      <g transform={`translate(0 ${geo.labelH})`}>
        {model.cells.map((cell, index) => (
          <CellBox
            key={index}
            cell={cell}
            index={index}
            geo={geo}
            palette={palette}
            stepIndex={stepIndex}
          />
        ))}
        {hidden > 0 && (
          <MutedText {...moreAt(model, geo)} palette={palette}>
            +{hidden} more
          </MutedText>
        )}
        <PointerTags pointers={model.pointers} geo={geo} palette={palette} />
      </g>
    </g>
  )
}
