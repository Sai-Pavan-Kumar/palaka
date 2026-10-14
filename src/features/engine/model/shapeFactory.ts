import type {
  ColorKey,
  DashStyle,
  FillStyle,
  FontKey,
  GeoKind,
  GeoShape,
  LineShape,
  SizeKey,
  StrokeKind,
  StrokePoint,
  StrokeShape,
  TextShape,
} from './types'

// The styles a new shape is born with. The style bar edits these, so
// "pick red, then draw" keeps drawing red.
export type ShapeStyle = {
  color: ColorKey
  size: SizeKey
  fill: FillStyle
  dash: DashStyle
  font: FontKey
  opacity: number
}

export const DEFAULT_STYLE: ShapeStyle = {
  color: 'black',
  size: 'm',
  fill: 'none',
  dash: 'hand',
  font: 'brand',
  opacity: 1,
}

const newId = () => crypto.randomUUID()

export function createStroke(
  kind: StrokeKind,
  start: StrokePoint,
  hasPressure: boolean,
  style: ShapeStyle,
): StrokeShape {
  return {
    id: newId(),
    type: 'stroke',
    kind,
    points: [start],
    color: style.color,
    size: style.size,
    scale: 1,
    hasPressure,
    opacity: style.opacity,
  }
}

export function createGeo(
  geo: GeoKind,
  box: { x: number; y: number; w: number; h: number },
  style: ShapeStyle,
): GeoShape {
  return {
    id: newId(),
    type: 'geo',
    geo,
    ...box,
    color: style.color,
    size: style.size,
    fill: style.fill,
    dash: style.dash,
    opacity: style.opacity,
  }
}

export function createLine(
  start: { x: number; y: number },
  arrowhead: boolean,
  style: ShapeStyle,
): LineShape {
  return {
    id: newId(),
    type: 'line',
    x1: start.x,
    y1: start.y,
    x2: start.x,
    y2: start.y,
    arrowhead,
    color: style.color,
    size: style.size,
    dash: style.dash,
    opacity: style.opacity,
  }
}

export function createText(
  at: { x: number; y: number },
  style: ShapeStyle,
): TextShape {
  return {
    id: newId(),
    type: 'text',
    x: at.x,
    y: at.y,
    text: '',
    font: style.font,
    size: style.size,
    scale: 1,
    color: style.color,
    opacity: style.opacity,
  }
}
