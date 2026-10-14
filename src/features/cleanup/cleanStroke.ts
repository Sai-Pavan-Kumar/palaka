import type { GeoShape, LineShape, StrokeShape } from '../engine/model/types'
import { recognizeShape } from './recognizeShape'

// Turns a finished "clean shapes" pen stroke into a neat rectangle, ellipse
// or line, keeping its colour, size and reveal step. Returns null for
// anything that is not clearly one of those (handwriting stays as drawn).
export function cleanStroke(stroke: StrokeShape): GeoShape | LineShape | null {
  const points = stroke.points.map(([x, y]) => ({ x, y }))
  const recognized = recognizeShape(points)
  if (!recognized) return null
  const shared = {
    id: stroke.id,
    color: stroke.color,
    size: stroke.size,
    opacity: stroke.opacity,
    revealStep: stroke.revealStep,
    // A hand-made feel while the geometry becomes clean.
    dash: 'hand' as const,
  }
  if (recognized.kind === 'line') {
    return {
      ...shared,
      type: 'line',
      x1: recognized.start.x,
      y1: recognized.start.y,
      x2: recognized.end.x,
      y2: recognized.end.y,
      arrowhead: false,
    }
  }
  return {
    ...shared,
    type: 'geo',
    geo: recognized.kind,
    x: recognized.x,
    y: recognized.y,
    w: recognized.w,
    h: recognized.h,
    fill: 'none',
  }
}
