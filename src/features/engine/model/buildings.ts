import type { BlockKind, BlockShape } from './types'

export type Roof =
  | 'flat'
  | 'gable'
  | 'dome'
  | 'spire'
  | 'sawtooth'
  | 'arch'
  | 'antenna'
  | 'awning'
  | 'canopy'
  | 'minarets'
  | 'tiers'
  | 'crenels'
  | 'tent'

export type Door = 'single' | 'double' | 'arch' | 'garage' | 'none'

export type BuildingSpec = {
  id: string
  label: string
  group: string
  roof: Roof
  // Window grid on the facade.
  rows: number
  cols: number
  door: Door
  // Lucide export drawn in the corner badge (cross, bed, book…).
  emblem: string
  // How it behaves in a simulation.
  kind: BlockKind
}

type Row = [string, string, Roof, number, number, Door, string, BlockKind]

// [id, label, roof, rows, cols, door, emblem, kind], grouped by street.
const ROWS: Record<string, Row[]> = {
  Work: [
    ['office', 'Office', 'flat', 4, 3, 'double', 'Briefcase', 'service'],
    [
      'skyscraper',
      'Skyscraper',
      'antenna',
      7,
      3,
      'double',
      'Building',
      'service',
    ],
    ['tech-campus', 'Tech campus', 'flat', 2, 5, 'double', 'Cpu', 'service'],
    ['startup', 'Startup garage', 'gable', 1, 2, 'garage', 'Rocket', 'service'],
    [
      'call-center',
      'Call centre',
      'flat',
      3,
      4,
      'double',
      'Headphones',
      'service',
    ],
    ['data-center', 'Data centre', 'flat', 2, 4, 'single', 'Server', 'cluster'],
    ['factory', 'Factory', 'sawtooth', 1, 4, 'garage', 'Factory', 'worker'],
    ['warehouse', 'Warehouse', 'arch', 1, 3, 'garage', 'Package', 'storage'],
    [
      'power-plant',
      'Power plant',
      'sawtooth',
      2,
      3,
      'single',
      'Zap',
      'service',
    ],
    ['bank', 'Bank', 'gable', 2, 4, 'double', 'Landmark', 'payment'],
    [
      'stock-exchange',
      'Stock exchange',
      'gable',
      2,
      5,
      'double',
      'ChartLine',
      'analytics',
    ],
  ],
  'Food & stay': [
    ['hotel', 'Hotel', 'flat', 5, 3, 'double', 'BedDouble', 'service'],
    ['resort', 'Resort', 'gable', 2, 4, 'double', 'TreePalm', 'service'],
    ['hostel', 'Hostel', 'flat', 3, 3, 'single', 'BedSingle', 'service'],
    [
      'restaurant',
      'Restaurant',
      'awning',
      1,
      3,
      'double',
      'Utensils',
      'service',
    ],
    ['cafe', 'Café', 'awning', 1, 2, 'single', 'Coffee', 'service'],
    ['bakery', 'Bakery', 'awning', 1, 2, 'single', 'Croissant', 'service'],
    ['bar', 'Bar', 'awning', 1, 2, 'single', 'Wine', 'service'],
  ],
  Shopping: [
    ['shop', 'Shop', 'awning', 1, 2, 'single', 'Store', 'service'],
    [
      'supermarket',
      'Supermarket',
      'flat',
      1,
      5,
      'double',
      'ShoppingCart',
      'service',
    ],
    ['mall', 'Mall', 'dome', 2, 5, 'double', 'ShoppingBag', 'service'],
    ['pharmacy', 'Pharmacy', 'awning', 1, 2, 'single', 'Pill', 'service'],
    ['showroom', 'Showroom', 'flat', 1, 3, 'double', 'Car', 'service'],
  ],
  Public: [
    ['hospital', 'Hospital', 'flat', 4, 4, 'double', 'Cross', 'service'],
    ['clinic', 'Clinic', 'gable', 1, 3, 'single', 'Stethoscope', 'service'],
    ['school', 'School', 'gable', 2, 4, 'double', 'School', 'service'],
    [
      'university',
      'University',
      'dome',
      2,
      5,
      'arch',
      'GraduationCap',
      'service',
    ],
    ['library', 'Library', 'gable', 2, 4, 'arch', 'Library', 'storage'],
    ['museum', 'Museum', 'dome', 2, 4, 'arch', 'Landmark', 'storage'],
    [
      'government',
      'Government office',
      'dome',
      3,
      5,
      'double',
      'Flag',
      'service',
    ],
    ['court', 'Court', 'gable', 2, 5, 'double', 'Scale', 'auth'],
    ['police', 'Police station', 'flat', 2, 4, 'double', 'Siren', 'firewall'],
    [
      'fire-station',
      'Fire station',
      'flat',
      1,
      3,
      'garage',
      'Flame',
      'alerting',
    ],
    ['post-office', 'Post office', 'gable', 1, 3, 'double', 'Mail', 'queue'],
    ['embassy', 'Embassy', 'flat', 3, 4, 'double', 'Flag', 'auth'],
    ['town-hall', 'Town hall', 'spire', 2, 4, 'arch', 'Clock', 'service'],
  ],
  Transport: [
    [
      'railway-station',
      'Railway station',
      'arch',
      1,
      5,
      'arch',
      'TrainFront',
      'gateway',
    ],
    [
      'metro',
      'Metro station',
      'canopy',
      0,
      0,
      'double',
      'TramFront',
      'gateway',
    ],
    ['bus-depot', 'Bus depot', 'flat', 1, 3, 'garage', 'Bus', 'queue'],
    ['airport', 'Airport', 'arch', 1, 6, 'double', 'Plane', 'gateway'],
    ['port', 'Port', 'sawtooth', 1, 4, 'garage', 'ShipCargo', 'queue'],
    ['gas-station', 'Fuel station', 'canopy', 0, 0, 'none', 'Fuel', 'service'],
    ['parking', 'Parking garage', 'flat', 3, 4, 'garage', 'Car', 'storage'],
    [
      'toll-plaza',
      'Toll plaza',
      'canopy',
      0,
      0,
      'none',
      'Ticket',
      'rateLimiter',
    ],
  ],
  'Faith & culture': [
    ['temple', 'Temple', 'tiers', 1, 2, 'arch', 'Sun', 'service'],
    ['mosque', 'Mosque', 'minarets', 1, 3, 'arch', 'Moon', 'service'],
    ['church', 'Church', 'spire', 1, 2, 'arch', 'Church', 'service'],
    ['cinema', 'Cinema', 'flat', 1, 3, 'double', 'Clapperboard', 'service'],
    ['theatre', 'Theatre', 'dome', 1, 4, 'arch', 'Drama', 'service'],
    ['stadium', 'Stadium', 'arch', 2, 6, 'double', 'Trophy', 'service'],
    ['gym', 'Gym', 'flat', 2, 3, 'double', 'Dumbbell', 'service'],
  ],
  Homes: [
    ['house', 'House', 'gable', 1, 2, 'single', 'House', 'service'],
    ['villa', 'Villa', 'gable', 2, 3, 'double', 'TreePine', 'service'],
    ['apartment', 'Apartment', 'flat', 5, 3, 'single', 'Building', 'service'],
    ['farm', 'Farm', 'gable', 1, 2, 'garage', 'Wheat', 'service'],
    ['castle', 'Castle', 'crenels', 2, 3, 'arch', 'Castle', 'firewall'],
    [
      'lighthouse',
      'Lighthouse',
      'spire',
      3,
      1,
      'single',
      'Lightbulb',
      'monitoring',
    ],
    ['tent', 'Camp tent', 'tent', 0, 0, 'none', 'TentTree', 'service'],
  ],
}

export const BUILDINGS: BuildingSpec[] = Object.entries(ROWS).flatMap(
  ([group, rows]) =>
    rows.map(([id, label, roof, r, c, door, emblem, kind]) => ({
      id: `bld:${id}`,
      label,
      group,
      roof,
      rows: r,
      cols: c,
      door,
      emblem,
      kind,
    })),
)

const BY_ID = new Map(BUILDINGS.map((b) => [b.id, b]))

export function getBuilding(icon: string | undefined): BuildingSpec | null {
  return icon ? (BY_ID.get(icon) ?? null) : null
}

export function isBuildingBlock(block: BlockShape): boolean {
  return getBuilding(block.icon) !== null
}

// Taller than a block, so the facade has room for its sign and windows.
export const BUILDING_SIZE = { w: 240, h: 280 }

type Rect = { x: number; y: number; w: number; h: number }

// Share of the height each roof takes above the facade.
const ROOF_SHARE: Record<Roof, number> = {
  flat: 0.05,
  gable: 0.22,
  dome: 0.24,
  spire: 0.3,
  sawtooth: 0.14,
  arch: 0.16,
  antenna: 0.16,
  awning: 0.05,
  canopy: 0.12,
  minarets: 0.26,
  tiers: 0.34,
  crenels: 0.08,
  tent: 0,
}

// The facade and its sign. Everything else is drawn relative to these.
export function getBuildingFrame(block: BlockShape, spec: BuildingSpec) {
  const { x, y, w, h } = block
  const inset = spec.roof === 'canopy' ? 0 : w * 0.08
  const roofH = h * ROOF_SHARE[spec.roof]
  const body: Rect = {
    x: x + inset,
    y: y + roofH,
    w: w - inset * 2,
    h: h - roofH,
  }
  const plateH = Math.min(52, Math.max(30, h * 0.13))
  const plateW = body.w * 0.84
  const plate: Rect = {
    x: body.x + (body.w - plateW) / 2,
    y: body.y + Math.max(8, h * 0.035),
    w: plateW,
    h: plateH,
  }
  // A tent has no facade: its sign hangs low, where the canvas is wide.
  if (spec.roof === 'tent') {
    plate.w = w * 0.56
    plate.x = x + (w - plate.w) / 2
    plate.y = y + h * 0.62
  }
  return { body, plate, roofH }
}
