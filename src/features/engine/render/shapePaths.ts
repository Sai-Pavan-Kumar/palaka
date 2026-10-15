import { getStroke } from 'perfect-freehand'
import rough from 'roughjs'
import { getPenWidth } from '../model/boardSpec'
import { getOutline, type OutlinedShape } from '../model/geoOutline'
import { getLineEndPointTangent } from '../model/lineRouting'
import type { DashStyle, LineShape, Point, StrokeShape } from '../model/types'

const roughGenerator = rough.generator()

// A gentle wobble: reads as hand-drawn without looking messy on video.
const ROUGH_OPTIONS = {
  roughness: 1.1,
  bowing: 0.8,
  disableMultiStroke: true,
  preserveVertices: true,
}

function midpoint(a: number, b: number): number {
  return (a + b) / 2
}

// Smooth closed outline: quadratic curves through the midpoints of the
// polygon perfect-freehand returns. Two decimals is far below one pixel.
function outlineToPath(outline: number[][]): string {
  if (outline.length < 4) return ''
  const [first, second, third] = outline
  const parts = [
    `M${first[0].toFixed(2)},${first[1].toFixed(2)}`,
    `Q${second[0].toFixed(2)},${second[1].toFixed(2)}`,
    `${midpoint(second[0], third[0]).toFixed(2)},${midpoint(second[1], third[1]).toFixed(2)} T`,
  ]
  for (let i = 2; i < outline.length - 1; i++) {
    const [ax, ay] = outline[i]
    const [bx, by] = outline[i + 1]
    parts.push(`${midpoint(ax, bx).toFixed(2)},${midpoint(ay, by).toFixed(2)}`)
  }
  parts.push('Z')
  return parts.join(' ')
}

export function getStrokePath(shape: StrokeShape): string {
  const size = getPenWidth(shape)
  // A marker has an even width; pressure would make it look like a brush.
  const options =
    shape.kind === 'highlighter'
      ? { size, thinning: 0, smoothing: 0.5, streamline: 0.5 }
      : {
          size,
          thinning: 0.6,
          smoothing: 0.5,
          streamline: 0.5,
          simulatePressure: !shape.hasPressure,
        }
  return outlineToPath(getStroke(shape.points, options))
}

// Same id, same wobble: the seed keeps a hand-drawn box from shivering every
// time it re-renders or is exported.
function seedFromId(id: string): number {
  let hash = 0
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) | 0
  }
  return (Math.abs(hash) % 2_000_000_000) + 1
}

function toPathStrings(drawable: ReturnType<typeof roughGenerator.line>) {
  return roughGenerator.toPaths(drawable).map((path) => path.d)
}

export function getRoughGeoPaths(shape: OutlinedShape, strokeWidth: number) {
  const options = { ...ROUGH_OPTIONS, seed: seedFromId(shape.id), strokeWidth }
  if (shape.type === 'geo') {
    const { x, y, w, h } = shape
    if (shape.geo === 'ellipse') {
      return toPathStrings(
        roughGenerator.ellipse(x + w / 2, y + h / 2, w, h, options),
      )
    }
    if (shape.geo === 'rectangle') {
      return toPathStrings(roughGenerator.rectangle(x, y, w, h, options))
    }
  }
  const points = getOutline(shape).map((p): [number, number] => [p.x, p.y])
  return toPathStrings(roughGenerator.polygon(points, options))
}

export function getRoughLinePaths(
  shape: LineShape,
  segments: [Point, Point][],
  strokeWidth: number,
): string[] {
  const options = { ...ROUGH_OPTIONS, seed: seedFromId(shape.id), strokeWidth }
  return segments.flatMap(([a, b]) =>
    toPathStrings(roughGenerator.line(a.x, a.y, b.x, b.y, options)),
  )
}

// The two short wings of an arrowhead, sized to the line width so a thick
// arrow gets a bold head.
export function getArrowheadWings(shape: LineShape, strokeWidth: number) {
  const { tip, angle } = getLineEndPointTangent(shape)
  const length = Math.max(18, strokeWidth * 4)
  const spread = Math.PI / 7
  const wing = (offset: number): Point => ({
    x: tip.x - Math.cos(angle + offset) * length,
    y: tip.y - Math.sin(angle + offset) * length,
  })
  return { tip, left: wing(spread), right: wing(-spread) }
}

export function getDashArray(
  dash: DashStyle,
  width: number,
): string | undefined {
  if (dash === 'dashed') return `${width * 3} ${width * 2.5}`
  if (dash === 'dotted') return `0 ${width * 2.2}`
  return undefined
}
