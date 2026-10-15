import type { ShapeStyle } from './shapeFactory'
import type { Shape } from './types'

// Which style fields mean something for each shape type. A red image or a
// hatched pen stroke would be nonsense, so those fields are skipped.
const APPLIES: Record<Shape['type'], (keyof ShapeStyle)[]> = {
  stroke: ['color', 'size', 'opacity'],
  geo: ['color', 'size', 'fill', 'dash', 'opacity'],
  line: ['color', 'size', 'dash', 'opacity', 'routing'],
  text: ['color', 'size', 'font', 'opacity', 'textAnimation'],
  image: ['opacity'],
  block: ['color', 'size', 'fill', 'dash', 'opacity', 'effect'],
  table: ['color', 'size', 'fill', 'dash', 'opacity'],
  highlight: [],
  tableState: [],
}

export function applyStylePatch(
  shape: Shape,
  patch: Partial<ShapeStyle>,
): Shape {
  const fields = APPLIES[shape.type].filter((key) => key in patch)
  if (fields.length === 0) return shape
  const picked = Object.fromEntries(fields.map((key) => [key, patch[key]]))
  return { ...shape, ...picked } as Shape
}

export function styleFieldsFor(types: Shape['type'][]): Set<keyof ShapeStyle> {
  return new Set(types.flatMap((type) => APPLIES[type]))
}

// The value every selected shape agrees on; undefined when they differ, so
// the style bar shows no active choice instead of a misleading one.
export function getSharedStyle(shapes: Shape[]): Partial<ShapeStyle> {
  const shared: Partial<ShapeStyle> = {}
  const keys: (keyof ShapeStyle)[] = [
    'color',
    'size',
    'fill',
    'dash',
    'font',
    'opacity',
    'textAnimation',
    'routing',
    'effect',
  ]
  for (const key of keys) {
    const values = shapes
      .filter((shape) => APPLIES[shape.type].includes(key))
      .map((shape) => (shape as Record<string, unknown>)[key])
    if (values.length > 0 && values.every((value) => value === values[0])) {
      Object.assign(shared, { [key]: values[0] })
    }
  }
  return shared
}
