// Board units are slide pixels: a 16:9 slide is 1920×1080, so a shape at
// x = 960 sits in the middle of the exported PNG and of the video frame.
export type Aspect = '16:9' | '9:16'

export type ColorKey =
  | 'black'
  | 'blue'
  | 'red'
  | 'green'
  | 'orange'
  | 'violet'
  // #005ae0 on every paper, even dark ones where `blue` turns light.
  | 'brand'
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
  // Made by a SELECT in the SQL panel ("q1:card", "q1:result", "q1:s0"), so
  // inserting again rebuilds it in place instead of adding a copy.
  fromQuery?: string
  // If true, the shape cannot be moved, resized, or deleted until unlocked.
  locked?: boolean
  // How it arrives on its reveal step. Missing = draws itself in.
  enter?: EnterStyle
  // Leaves the board at this step (it was explained, make room).
  exit?: { style: ExitStyle; step: number }
  // A single "look here" pulse at this step.
  pulseStep?: number
  // Missing = normal pace.
  animSpeed?: AnimSpeed
}

export type EnterStyle = 'draw' | 'fade' | 'pop' | 'rise'
export type ExitStyle = 'fade' | 'shrink'
export type AnimSpeed = 'fast' | 'slow'

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

// An end glued to another shape. The end's x/y is still stored (kept up to
// date by connectors.ts), so render, export and hit tests never look the
// target up.
export type Binding = {
  shapeId: string
  // On a table: attach at this column's row instead of the centre.
  column?: string
  // Where on the shape the end was dropped, as 0..1 of its box. Missing =
  // aim at the centre and slide around the outline (the old behaviour).
  anchor?: Point
}

export type LineRouting = 'straight' | 'elbow' | 'curved'

// Lines and arrows are one type: an arrow is a line with a head. Bound ends
// make it a connector that follows blocks around.
export type LineShape = ShapeBase & {
  type: 'line'
  x1: number
  y1: number
  x2: number
  y2: number
  arrowhead: boolean
  routing?: LineRouting
  // Elbow only: which way the first leg runs. Set when both ends are glued,
  // so the arrow enters the facing side; missing = the longer axis first.
  elbowAxis?: 'h' | 'v'
  size: SizeKey
  dash: DashStyle
  startBinding?: Binding
  endBinding?: Binding
  // Small tag at the middle ("HTTPS", "writes"). Empty or missing = none.
  label?: string
  // Dots travelling along the line (requests, data). Missing = no flow.
  flow?: Flow
}

export type FlowDirection = 'forward' | 'backward' | 'both'
export type FlowSpeed = 'slow' | 'normal' | 'fast'
export type FlowStyle = 'dots' | 'pulse'

export type Flow = {
  direction: FlowDirection
  speed?: FlowSpeed
  style?: FlowStyle
  // Reveal step at which the dots start moving. Missing = they move as soon
  // as the line is on screen.
  step?: number
}

// System-design building blocks. Names and groups live in blockCatalog.ts.
export type BlockKind =
  | 'user'
  | 'browser'
  | 'mobile'
  | 'dns'
  | 'cdn'
  | 'loadBalancer'
  | 'gateway'
  | 'rateLimiter'
  | 'circuitBreaker'
  | 'service'
  | 'worker'
  | 'function'
  | 'cluster'
  | 'sqlDb'
  | 'noSqlDb'
  | 'cache'
  | 'storage'
  | 'search'
  | 'queue'
  | 'pubSub'
  | 'external'
  | 'auth'
  | 'monitoring'
  | 'custom'
  | 'desktop'
  | 'iot'
  | 'admin'
  | 'firewall'
  | 'reverseProxy'
  | 'router'
  | 'webServer'
  | 'container'
  | 'scheduler'
  | 'cloud'
  | 'warehouse'
  | 'graphDb'
  | 'timeSeriesDb'
  | 'replica'
  | 'shard'
  | 'fileSystem'
  | 'keyValue'
  | 'vectorDb'
  | 'eventBus'
  | 'stream'
  | 'webhook'
  | 'notification'
  | 'email'
  | 'sms'
  | 'secrets'
  | 'certificate'
  | 'identity'
  | 'logging'
  | 'alerting'
  | 'tracing'
  | 'ciCd'
  | 'config'
  | 'featureFlags'
  | 'llm'
  | 'mlModel'
  | 'payment'
  | 'analytics'
  | 'maps'

export type BlockEffect = 'none' | 'glow' | 'meteorite' | 'dash'

export type BlockShape = ShapeBase & {
  type: 'block'
  kind: BlockKind
  x: number
  y: number
  w: number
  h: number
  label: string
  size: SizeKey
  fill: FillStyle
  dash: DashStyle
  effect?: BlockEffect
  // Library icon ("aws:…", "si:…") drawn instead of the kind's line icon.
  icon?: string
  // Simulation numbers the teacher changed. Missing = the kind's default.
  sim?: SimSettings
}

// Per second for rates, 0..1 for hit rate, a count for capacity and size.
export type SimSettings = {
  rate?: number
  hitRate?: number
  capacity?: number
  size?: number
  retries?: number
  failRate?: number
  writes?: number
  // 1 = undo finished steps when a later one fails (saga).
  compensate?: number
}

export type TextAnimation = 'wipe' | 'typewriter' | 'slide-up' | 'blur-in'

export type TextShape = ShapeBase & {
  type: 'text'
  // Top-left corner of the first line.
  x: number
  y: number
  text: string
  font: FontKey
  size: SizeKey
  scale: number
  textAnimation?: TextAnimation
  // Present only on a code-simulation card: the "Run with" line
  // (e.g. "Solution().search([1, 3], 3)") that runs after the code.
  codeCall?: string
  // Overrides the code simulation's guess of what to draw: which variables
  // are arrays, which are pointers into them. Empty = guess.
  codePins?: CodePins
  // On: while presenting, Space steps through the code once this card is
  // shown, then moves on. Off/missing: the card is a plain reveal object.
  codeStepThrough?: boolean
}

export type CodePins = { arrays: string[]; pointers: string[] }

export type ImageShape = ShapeBase & {
  type: 'image'
  x: number
  y: number
  w: number
  h: number
  assetId: string
}

export type TableColumn = {
  name: string
  type: string
  pk: boolean
  notNull: boolean
  unique: boolean
  fk?: { table: string; column: string }
}

// A database table drawn from pasted SQL. Its size comes from its content
// (measured like text) times `scale`, so rows never squash.
export type TableShape = ShapeBase & {
  type: 'table'
  x: number
  y: number
  scale: number
  name: string
  columns: TableColumn[]
  size: SizeKey
  // Header band fill; the body stays paper so rows read cleanly.
  fill: FillStyle
  dash: DashStyle
  // Sample rows (from INSERT), aligned to `columns`. NULL is null.
  rows?: (string | null)[][]
  // Maximum rows this table will reach after mutations, so its outline encloses them.
  maxRows?: number
  // Column list (schema) or a grid of the sample rows (data).
  view?: TableView
}

export type TableView = 'schema' | 'data'

// An effect: draws nothing itself. Once its reveal step is reached while
// presenting, the target tables light up these columns.
// An effect: one clause of a query (WHERE, ORDER BY…). Once its step is
// reached while presenting, the table's rows take these states.
export type TableStateShape = ShapeBase & {
  type: 'tableState'
  tableId: string
  label: string
  rows: {
    dim: boolean
    group: number | null
    pos: number
    values?: (string | null)[]
    isNew?: boolean
    error?: string
  }[]
  // Multi-table JOIN steps: row states for additional tables at this same step.
  tableStates?: {
    tableId: string
    rows: {
      dim: boolean
      group: number | null
      pos: number
      values?: (string | null)[]
      isNew?: boolean
      error?: string
    }[]
  }[]
}

export type HighlightShape = ShapeBase & {
  type: 'highlight'
  targets: { tableId: string; column: string }[]
}

export type Shape =
  | StrokeShape
  | GeoShape
  | LineShape
  | TextShape
  | ImageShape
  | BlockShape
  | TableShape
  | HighlightShape
  | TableStateShape
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
  // 1 = standard 16:9 frame, 2 = wide 32:9 sequence (2 connected 16:9 frames)
  frameCount?: 1 | 2
}

// One paper for the whole board, so a video never changes look between pages.
export type PaperPattern = 'plain' | 'dots' | 'grid' | 'grain' | 'blueprint'
export type PaperColor = 'white' | 'cream' | 'black' | 'blueprint' | 'chalk'

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
