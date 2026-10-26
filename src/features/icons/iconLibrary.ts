import { create } from 'zustand'
import { BUILDING_ICONS } from '../buildings/buildingIcons'
import type { AwsIcon, LibraryIcon, RealWorldIcon } from './iconTypes'

type IconLibraryState = {
  // null until the packs arrive; blocks show their kind's icon meanwhile.
  byId: Map<string, LibraryIcon> | null
  list: LibraryIcon[]
}

export const useIconLibrary = create<IconLibraryState>(() => ({
  byId: null,
  list: [],
}))

let loading: Promise<void> | null = null

// ~1 MB of icons the board does not need to open, so it is fetched only when
// the block menu opens or a block on the board uses a library icon.
export function loadIconLibrary(): Promise<void> {
  loading ??= Promise.all([
    import('./generated/realWorldIcons'),
    import('./generated/brandIcons'),
    import('./generated/awsIcons'),
  ]).then(([realWorld, brands, aws]) => {
    const list: LibraryIcon[] = [
      ...BUILDING_ICONS,
      ...realWorld.REAL_WORLD_ICONS,
      ...brands.BRAND_ICONS,
      ...aws.AWS_ICONS,
    ]
    useIconLibrary.setState({ list, byId: new Map(list.map((i) => [i.id, i])) })
  })
  return loading
}

export function isAwsIcon(icon: LibraryIcon): icon is AwsIcon {
  return 'svg' in icon
}

export function isRealWorldIcon(icon: LibraryIcon): icon is RealWorldIcon {
  return 'Icon' in icon
}

const dataUrls = new Map<string, string>()

// Data URLs (not file paths) so PNG/PDF exports carry the icon inside them.
export function awsIconUrl(icon: AwsIcon): string {
  let url = dataUrls.get(icon.id)
  if (!url) {
    url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(icon.svg)}`
    dataUrls.set(icon.id, url)
  }
  return url
}

export function matchesIcon(icon: LibraryIcon, query: string): boolean {
  const q = query.trim().toLowerCase()
  return !q || `${icon.label} ${icon.keywords}`.toLowerCase().includes(q)
}

// Brand colours are chosen for white pages. A near-black logo on dark paper
// (or near-white on light) would vanish, so it falls back to the ink colour.
export function brandFill(hex: string, tone: 'light' | 'dark', ink: string) {
  const n = parseInt(hex, 16)
  const r = (n >> 16) & 255
  const g = (n >> 8) & 255
  const b = n & 255
  const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255
  if (tone === 'dark' && luminance < 0.2) return ink
  if (tone === 'light' && luminance > 0.85) return ink
  return `#${hex}`
}
