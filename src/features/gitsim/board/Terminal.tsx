import { useId } from 'react'
import { FONT_FAMILY, FONT_WEIGHT } from '../../engine/model/boardSpec'
import type { BoardPalette } from '../../engine/model/paper'
import type { GitStep } from '../engine/types'
import { CHAR_WIDTH, charsThatFit, clip, wrap } from './fitText'

const X = 60
const PAD = 28
const CAPTION = { size: 32, line: 40, lines: 2 }
const COMMAND = { size: 25, gap: 52 }
const OUTPUT = { size: 20, line: 30 }

type Fit = { caption: string[]; command: string; output: string[] }

// Everything is cut to the box by character budget, so a long log line or
// caption can never run off the board edge mid-recording.
function fitStep(step: GitStep, innerWidth: number, height: number): Fit {
  const caption = wrap(
    step.caption,
    charsThatFit(innerWidth, CAPTION.size, CHAR_WIDTH.brand),
    CAPTION.lines,
  )
  const command = clip(
    `$ ${step.command}`,
    charsThatFit(innerWidth, COMMAND.size, CHAR_WIDTH.code),
  )
  const used = PAD + caption.length * CAPTION.line + COMMAND.gap
  const rows = Math.max(0, Math.floor((height - used - PAD) / OUTPUT.line))
  const outChars = charsThatFit(innerWidth, OUTPUT.size, CHAR_WIDTH.code)
  // Long output (a full log) keeps its newest lines, like a real terminal.
  const output = rows
    ? step.output.slice(-rows).map((l) => clip(l, outChars))
    : []
  return { caption, command, output }
}

function CaptionLines({
  lines,
  top,
  palette,
}: {
  lines: string[]
  top: number
  palette: BoardPalette
}) {
  return (
    <>
      {lines.map((line, i) => (
        <text
          key={i}
          x={X + PAD}
          y={top + PAD + (i + 1) * CAPTION.line - 8}
          fontFamily={FONT_FAMILY.brand}
          fontWeight={FONT_WEIGHT.brand}
          fontSize={CAPTION.size}
          fill={palette.brand}
        >
          {line}
        </text>
      ))}
    </>
  )
}

function StepText({
  step,
  fit,
  top,
  palette,
}: {
  step: GitStep
  fit: Fit
  top: number
  palette: BoardPalette
}) {
  const commandY =
    top + PAD + fit.caption.length * CAPTION.line + COMMAND.gap - 14
  return (
    <>
      <CaptionLines lines={fit.caption} top={top} palette={palette} />
      {step.command && (
        <text
          x={X + PAD}
          y={commandY}
          fontSize={COMMAND.size}
          fill={palette.ink.black}
          style={{ whiteSpace: 'pre' }}
        >
          <tspan fill={palette.brand}>$ </tspan>
          {fit.command.slice(2)}
        </text>
      )}
      {fit.output.map((line, i) => (
        <text
          key={i}
          x={X + PAD}
          y={commandY + (i + 1) * OUTPUT.line}
          fontSize={OUTPUT.size}
          fill={step.error ? palette.ink.red : palette.ink.black}
          opacity={step.error ? 1 : 0.75}
          style={{ whiteSpace: 'pre' }}
        >
          {line}
        </text>
      ))}
    </>
  )
}

// The caption sits on top so a viewer reads the meaning before the syntax.
export function Terminal({
  step,
  stepIndex,
  top,
  width,
  height,
  palette,
}: {
  step: GitStep
  stepIndex: number
  top: number
  width: number
  height: number
  palette: BoardPalette
}) {
  const clipId = useId()
  const boxWidth = width - X * 2
  const fit = fitStep(step, boxWidth - PAD * 2, height)
  return (
    <g fontFamily={FONT_FAMILY.code}>
      <clipPath id={clipId}>
        <rect x={X} y={top} width={boxWidth} height={height} rx={18} />
      </clipPath>
      <rect
        x={X}
        y={top}
        width={boxWidth}
        height={height}
        rx={18}
        fill={palette.ink.black}
        opacity={0.06}
      />
      {/* Keyed by step, so even a repeated command fades in fresh. */}
      <g key={stepIndex} className="gitsim-type" clipPath={`url(#${clipId})`}>
        <StepText step={step} fit={fit} top={top} palette={palette} />
      </g>
    </g>
  )
}
