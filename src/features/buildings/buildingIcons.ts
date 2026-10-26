import { BUILDINGS } from '../engine/model/buildings'
import type { RealWorldIcon } from '../icons/iconTypes'
import { EMBLEMS } from './emblems'

// Buildings in the block menu: the emblem stands in for the drawing, and
// picking one drops a full building with its name on the sign.
export const BUILDING_ICONS: RealWorldIcon[] = BUILDINGS.map((b) => ({
  id: b.id,
  label: b.label,
  group: `Buildings · ${b.group}`,
  kind: b.kind,
  keywords: `building ${b.label} ${b.id.slice(4)}`.toLowerCase(),
  Icon: EMBLEMS[b.emblem],
}))
