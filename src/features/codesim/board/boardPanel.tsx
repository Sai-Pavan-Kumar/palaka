import type { ReactNode } from 'react'
import { FONT_FAMILY } from '../../engine/model/boardSpec'
import type { BoardPalette } from '../../engine/model/paper'
import type { PanelMetrics } from './panelLayout'

function PanelTitle({
  title,
  subtitle,
  m,
  palette,
}: {
  title: string
  subtitle?: string
  m: PanelMetrics
  palette: BoardPalette
}) {
  return (
    <text
      x={m.pad}
      y={m.titleH * 0.68}
      fill={palette.ink.black}
      fillOpacity={0.55}
      fontFamily={FONT_FAMILY.brand}
      fontWeight={600}
      fontSize={m.fontPx * 0.8}
      letterSpacing={m.fontPx * 0.04}
    >
      {title.toUpperCase()}
      {subtitle && (
        <tspan fontFamily={FONT_FAMILY.code} fontWeight={400} dx={m.pad}>
          {subtitle}
        </tspan>
      )}
    </text>
  )
}

// A calm card on the paper with a small grotesk title; rows go inside.
export function BoardPanel({
  x,
  y,
  width,
  height,
  title,
  subtitle,
  m,
  palette,
  children,
}: {
  x: number
  y: number
  width: number
  height: number
  title: string
  subtitle?: string
  m: PanelMetrics
  palette: BoardPalette
  children: ReactNode
}) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect
        width={width}
        height={height}
        rx={m.pad}
        fill={palette.paper}
        stroke={palette.ink.black}
        strokeOpacity={0.18}
        strokeWidth={2}
      />
      <PanelTitle title={title} subtitle={subtitle} m={m} palette={palette} />
      <g transform={`translate(0 ${m.titleH})`}>{children}</g>
    </g>
  )
}
