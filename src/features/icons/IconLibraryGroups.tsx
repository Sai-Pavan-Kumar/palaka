import { ChevronRight } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import {
  awsIconUrl,
  brandFill,
  isAwsIcon,
  isRealWorldIcon,
  loadIconLibrary,
  matchesIcon,
  useIconLibrary,
} from './iconLibrary'
import type { LibraryIcon } from './iconTypes'

// The menu is dark chrome, so brand logos are judged against dark.
const MENU_INK = 'currentColor'

// Three families, each folded away until opened or searched, so the menu
// opens on the familiar blocks instead of 840 icons.
const FAMILIES = ['Buildings', 'Real world', 'Brands', 'AWS'] as const
type Family = (typeof FAMILIES)[number]

function familyOf(icon: LibraryIcon): Family {
  if (icon.id.startsWith('bld:')) return 'Buildings'
  if (isRealWorldIcon(icon)) return 'Real world'
  return isAwsIcon(icon) ? 'AWS' : 'Brands'
}

// "Real world · Food" → "Food"; brand groups have no prefix.
function subgroupOf(icon: LibraryIcon): string {
  return icon.group.split(' · ').pop() ?? icon.group
}

function MenuIcon({ icon }: { icon: LibraryIcon }) {
  if (isRealWorldIcon(icon)) {
    return <icon.Icon size={18} strokeWidth={1.75} aria-hidden />
  }
  if (isAwsIcon(icon)) {
    return <img src={awsIconUrl(icon)} width={18} height={18} alt="" />
  }
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" aria-hidden>
      <path d={icon.path} fill={brandFill(icon.hex, 'dark', MENU_INK)} />
    </svg>
  )
}

function groupBy<T>(items: T[], key: (item: T) => string): [string, T[]][] {
  const groups = new Map<string, T[]>()
  for (const item of items) {
    groups.set(key(item), [...(groups.get(key(item)) ?? []), item])
  }
  return [...groups.entries()]
}

type PickProps = {
  currentId: string | null
  onPick: (icon: LibraryIcon) => void
}

function IconGrid({
  icons,
  currentId,
  onPick,
}: PickProps & { icons: LibraryIcon[] }) {
  return (
    <div className="block-menu__grid">
      {icons.map((icon) => (
        <button
          key={icon.id}
          type="button"
          title={icon.label}
          className={`menu-item block-menu__item ${icon.id === currentId ? 'is-active' : ''}`}
          onClick={() => onPick(icon)}
        >
          <MenuIcon icon={icon} />
          <span className="block-menu__name">{icon.label}</span>
        </button>
      ))}
    </div>
  )
}

function FamilyFold({
  family,
  icons,
  isSearching,
  ...pick
}: PickProps & { family: Family; icons: LibraryIcon[]; isSearching: boolean }) {
  const [isOpen, setOpen] = useState(false)
  const expanded = isOpen || isSearching
  return (
    <section className="block-menu__group">
      <button
        type="button"
        className="block-menu__fold"
        aria-expanded={expanded}
        onClick={() => setOpen(!isOpen)}
      >
        <ChevronRight
          size={14}
          className={expanded ? 'is-open' : undefined}
          aria-hidden
        />
        {family}
        <span className="block-menu__count">{icons.length}</span>
      </button>
      {expanded &&
        groupBy(icons, subgroupOf).map(([name, list]) => (
          <div key={name}>
            <p className="block-menu__subhead">{name}</p>
            <IconGrid icons={list} {...pick} />
          </div>
        ))}
    </section>
  )
}

// Real-world analogies, brands and AWS under the built-in blocks. Each
// still behaves like its kind in a simulation (Waiter balances, Redis caches).
export function IconLibraryGroups({
  query,
  hasOtherMatches,
  ...pick
}: PickProps & { query: string; hasOtherMatches: boolean }) {
  const list = useIconLibrary((s) => s.list)
  const isLoaded = useIconLibrary((s) => s.byId !== null)
  useEffect(() => {
    void loadIconLibrary()
  }, [])
  const families = useMemo(() => {
    const shown = list.filter((icon) => matchesIcon(icon, query))
    return FAMILIES.map((family) => ({
      family,
      icons: shown.filter((icon) => familyOf(icon) === family),
    })).filter((f) => f.icons.length > 0)
  }, [list, query])

  if (!isLoaded) {
    return <p className="block-menu__empty">Loading 1,000+ icons…</p>
  }
  if (families.length === 0) {
    return hasOtherMatches ? null : (
      <p className="block-menu__empty">
        No icon matches. Try the custom block.
      </p>
    )
  }
  return families.map(({ family, icons }) => (
    <FamilyFold
      key={family}
      family={family}
      icons={icons}
      isSearching={query.trim() !== ''}
      {...pick}
    />
  ))
}
