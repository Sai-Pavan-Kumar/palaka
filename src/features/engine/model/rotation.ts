import type { Point } from './types'

export function rotatePoint(
  point: Point,
  centre: Point,
  degrees: number,
): Point {
  if (degrees === 0) return point
  const radians = (degrees * Math.PI) / 180
  const cos = Math.cos(radians)
  const sin = Math.sin(radians)
  const dx = point.x - centre.x
  const dy = point.y - centre.y
  return {
    x: centre.x + dx * cos - dy * sin,
    y: centre.y + dx * sin + dy * cos,
  }
}

export function normalizeDegrees(degrees: number): number {
  return ((degrees % 360) + 360) % 360
}

export function rotationTransform(degrees: number, centre: Point) {
  return `rotate(${degrees} ${centre.x} ${centre.y})`
}
