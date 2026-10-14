// Board units are slide pixels: a 16:9 slide is 1920×1080, so a shape at
// x = 960 sits in the middle of the exported PNG and of the video frame.
export type Aspect = '16:9' | '9:16'

export type ColorKey = 'black' | 'blue' | 'red' | 'green' | 'orange' | 'violet'
export type SizeKey = 's' | 'm' | 'l' | 'xl'
export type FillStyle = 'none' | 'tint' | 'solid' | 'hatch'
export type DashStyle = 'hand' | 'clean' | 'dashed' | 'dotted'
export type FontKey = 'brand' | 'code'

// Pressure stays with each point so a real pen keeps its line weight after
// the stroke is moved, resized or reloaded.
export type StrokePoint = [x: number, y: number, pressure: number]

type ShapeBase = {
  id: string
  color: ColorKey
  opacity: number
  // Order in which the shape appears while presenting. Missing = always visible.
  revealStep?: number
}

export type StrokeKind = 'pen' | 'highlighter'

export type StrokeShape = ShapeBase & {
  type: 'stroke'
  kind: StrokeKind
  points: StrokePoint[]
  size: SizeKey
  // Grows and shrinks with resizing, so shrunk handwriting gets thinner ink.
  scale: number
  // Mouse and trackpad report a flat 0.5, so their line weight is simulated
  // from speed instead. A real pen gets its true pressure.
  hasPressure: boolean
}

export type GeoKind = 'rectangle' | 'ellipse' | 'triangle' | 'diamond' | 'heart'

export type GeoShape = ShapeBase & {
  type: 'geo'
  geo: GeoKind
  x: number
  y: number
  w: number
  h: number
  size: SizeKey
  fill: FillStyle
  dash: DashStyle
}

// Lines and arrows are one type: an arrow is a line with a head.
export type LineShape = ShapeBase & {
  type: 'line'
  x1: number
  y1: number
  x2: number
  y2: number
  arrowhead: boolean
  size: SizeKey
  dash: DashStyle
}

export type TextShape = ShapeBase & {
  type: 'text'
  // Top-left corner of the first line.
  x: number
  y: number
  text: string
  font: FontKey
  size: SizeKey
  scale: number
}

export type ImageShape = ShapeBase & {
  type: 'image'
  x: number
  y: number
  w: number
  h: number
  assetId: string
}

export type Shape = StrokeShape | GeoShape | LineShape | TextShape | ImageShape
export type ShapeType = Shape['type']

// src is a data URL (no folder) or a path inside the video folder such as
// "assets/1-intro.png", so board.json stays small when a folder is open.
export type ImageAsset = {
  id: string
  src: string
  name: string
  w: number
  h: number
}

export type Page = {
  id: string
  name: string
  shapes: Record<string, Shape>
  // Paint order: the last id is drawn on top.
  order: string[]
}

// One paper for the whole board, so a video never changes look between pages.
export type PaperPattern = 'plain' | 'dots' | 'grid' | 'grain' | 'blueprint'
export type PaperColor = 'white' | 'cream' | 'mist' | 'blueprint' | 'chalk'

export type Paper = {
  pattern: PaperPattern
  color: PaperColor
  // "The SurfBoard" in the top-left corner of every page.
  showBrand: boolean
}

export type BoardDocument = {
  version: 2
  aspect: Aspect
  paper: Paper
  pages: Page[]
  assets: Record<string, ImageAsset>
}

export type Bounds = {
  minX: number
  minY: number
  maxX: number
  maxY: number
}

export type Point = { x: number; y: number }
