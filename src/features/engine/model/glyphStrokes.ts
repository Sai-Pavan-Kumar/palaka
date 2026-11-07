// Fonts store outlines, not pen paths. To write a letter the way a hand does we
// recover its centre lines from a raster of the glyph, then order them the way
// people write: top first, stems downward, pen lifted between strokes.

export type StrokePoint = { x: number; y: number }

export type GlyphStrokes = {
  strokes: StrokePoint[][]
  // Half of the thickest part of the letter, so one pass uncovers the stroke.
  penRadius: number
}

export type InkGrid = { ink: Uint8Array; width: number; height: number }

const OFFSETS = [
  [0, -1],
  [1, -1],
  [1, 0],
  [1, 1],
  [0, 1],
  [-1, 1],
  [-1, 0],
  [-1, -1],
]
// A branch shorter than this is a thinning artefact, unless it stands alone
// like the dot on an i.
const MIN_STROKE_PX = 10
// A loose end always beats a mid-line pixel as a place to start.
const MID_LINE_PENALTY = 400
// Height dominates: in a slanted font the bottom of a stem sits further left
// than its top, so "leftmost" would start the pen at the bottom.
const LEFTWARD_WEIGHT = 0.25
const MIN_CLIMB_PX = 14
const CLIMB_END_TOLERANCE_PX = 3
const HEADING_LOOKBACK = 6
const SMOOTH_REACH = 3
const PEN_MARGIN_PX = 3

function canPeel(grid: Uint8Array, width: number, index: number, pass: number) {
  const n = OFFSETS.map(([dx, dy]) => grid[index + dy * width + dx])
  const count = n.reduce((sum, value) => sum + value, 0)
  if (count < 2 || count > 6) return false
  let flips = 0
  for (let i = 0; i < 8; i++) if (!n[i] && n[(i + 1) % 8]) flips++
  if (flips !== 1) return false
  const blocked =
    pass === 0
      ? n[0] * n[2] * n[4] || n[2] * n[4] * n[6]
      : n[0] * n[2] * n[6] || n[0] * n[4] * n[6]
  return !blocked
}

// Zhang-Suen thinning: peels the letter from outside until one pixel of centre
// line is left, the closest thing an outline font has to a pen path.
export function thinInk({ ink, width, height }: InkGrid): Uint8Array {
  const grid = ink.slice()
  let changed = true
  while (changed) {
    changed = false
    for (const pass of [0, 1]) {
      const peeled: number[] = []
      for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
          const index = y * width + x
          if (grid[index] && canPeel(grid, width, index, pass)) {
            peeled.push(index)
          }
        }
      }
      for (const index of peeled) grid[index] = 0
      if (peeled.length) changed = true
    }
  }
  return grid
}

function freeNeighbours(free: Uint8Array, width: number, at: StrokePoint) {
  return OFFSETS.map(([dx, dy]) => ({ x: at.x + dx, y: at.y + dy })).filter(
    (point) => free[point.y * width + point.x],
  )
}

function pickStart(free: Uint8Array, width: number, height: number) {
  let best: StrokePoint | null = null
  let bestScore = Infinity
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      if (!free[y * width + x]) continue
      const isLooseEnd = freeNeighbours(free, width, { x, y }).length <= 1
      const score =
        y + x * LEFTWARD_WEIGHT + (isLooseEnd ? 0 : MID_LINE_PENALTY)
      if (score < bestScore) {
        bestScore = score
        best = { x, y }
      }
    }
  }
  return best
}

// At a junction the pen carries straight on instead of turning sharply.
function walkStroke(free: Uint8Array, width: number, start: StrokePoint) {
  const points = [start]
  free[start.y * width + start.x] = 0
  let current = start
  for (;;) {
    const options = freeNeighbours(free, width, current)
    if (!options.length) return points
    const back = points[Math.max(0, points.length - HEADING_LOOKBACK)]
    const heading = Math.atan2(current.y - back.y, current.x - back.x)
    const from = current
    const turn = (point: StrokePoint) => {
      const angle = Math.atan2(point.y - from.y, point.x - from.x)
      const diff = Math.abs(angle - heading)
      return Math.min(diff, Math.PI * 2 - diff)
    }
    current = options.sort((a, b) => turn(a) - turn(b))[0]
    free[current.y * width + current.x] = 0
    points.push(current)
  }
}

// A stroke whose only loose end is at the bottom (the tail of an e) would be
// walked upward from that end, so it gets turned round.
function startFromTop(points: StrokePoint[]) {
  const isUpward = points[points.length - 1].y < points[0].y
  return isUpward ? [...points].reverse() : points
}

// An n has both loose ends at the bottom, so its walk climbs the stem first.
// A hand writes that stem downward, then goes back to the top for the arch.
function splitLeadingClimb(points: StrokePoint[]) {
  let peak = 0
  for (let i = 1; i < points.length; i++) {
    if (points[i].y < points[peak].y) peak = i
    else if (points[i].y > points[peak].y + CLIMB_END_TOLERANCE_PX) break
  }
  const climb = points[0].y - points[peak].y
  const drift = Math.abs(points[peak].x - points[0].x)
  if (climb < MIN_CLIMB_PX || drift > climb) return [points]
  return [points.slice(0, peak + 1).reverse(), points.slice(peak)]
}

function smooth(points: StrokePoint[]) {
  return points.map((_, index) => {
    const near = points.slice(
      Math.max(0, index - SMOOTH_REACH),
      index + SMOOTH_REACH + 1,
    )
    return {
      x: near.reduce((sum, point) => sum + point.x, 0) / near.length,
      y: near.reduce((sum, point) => sum + point.y, 0) / near.length,
    }
  })
}

function getPenRadius({ ink, width }: InkGrid) {
  const distance = new Int16Array(ink.length).fill(-1)
  let frontier: number[] = []
  ink.forEach((value, index) => {
    if (value) return
    distance[index] = 0
    frontier.push(index)
  })
  let radius = 1
  while (frontier.length) {
    const next: number[] = []
    for (const index of frontier) {
      for (const step of [-1, 1, -width, width]) {
        const to = index + step
        if (to < 0 || to >= ink.length || distance[to] >= 0) continue
        distance[to] = distance[index] + 1
        radius = Math.max(radius, distance[to])
        next.push(to)
      }
    }
    frontier = next
  }
  return radius + PEN_MARGIN_PX
}

export function extractGlyphStrokes(grid: InkGrid): GlyphStrokes {
  const { width, height } = grid
  const skeleton = thinInk(grid)
  const free = skeleton.slice()
  const strokes: StrokePoint[][] = []
  const touchesWritten = ({ x, y }: StrokePoint) =>
    OFFSETS.some(([dx, dy]) => {
      const index = (y + dy) * width + x + dx
      return skeleton[index] && !free[index]
    })
  for (
    let start = pickStart(free, width, height);
    start;
    start = pickStart(free, width, height)
  ) {
    const hadContact = strokes.length > 0 && touchesWritten(start)
    const points = walkStroke(free, width, start)
    if (points.length < MIN_STROKE_PX && hadContact) continue
    for (const part of splitLeadingClimb(startFromTop(points))) {
      strokes.push(smooth(part))
    }
  }
  return { strokes, penRadius: getPenRadius(grid) }
}

export function getStrokeLength(points: StrokePoint[]): number {
  let length = 0
  for (let i = 1; i < points.length; i++) {
    length += Math.hypot(
      points[i].x - points[i - 1].x,
      points[i].y - points[i - 1].y,
    )
  }
  return length
}
