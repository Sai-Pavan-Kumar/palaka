import { useEffect, useMemo } from 'react'
import {
  awsIconUrl,
  brandFill,
  isAwsIcon,
  loadIconLibrary,
  matchesIcon,
  useIconLibrary,
} from './iconLibrary'
import type { LibraryIcon } from './iconTypes'

// The menu is dark chrome, so brand logos are judged against dark.
const MENU_INK = 'currentColor'

function MenuIcon({ icon }: { icon: LibraryIcon }) {
  if (isAwsIcon(icon)) {
    return <img src={awsIconUrl(icon)} width={18} height={18} alt="" />
  }
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" aria-hidden>
      <path d={icon.path} fill={brandFill(icon.hex, 'dark', MENU_INK)} />
    </svg>
  )
}

function groupIcons(icons: LibraryIcon[]): [string, LibraryIcon[]][] {
  const groups = new Map<string, LibraryIcon[]>()
  for (const icon of icons) {
    const list = groups.get(icon.group) ?? []
    list.push(icon)
    groups.set(icon.group, list)
  }
  return [...groups.entries()]
}

// Brands and AWS services under the built-in blocks. Each still behaves
// like its kind in a simulation (Redis is a cache, SQS a queue).
export function IconLibraryGroups({
  query,
  currentId,
  hasOtherMatches,
  onPick,
}: {
  query: string
  currentId: string | null
  hasOtherMatches: boolean
  onPick: (icon: LibraryIcon) => void
}) {
  const list = useIconLibrary((s) => s.list)
  const isLoaded = useIconLibrary((s) => s.byId !== null)
  useEffect(() => {
    void loadIconLibrary()
  }, [])
  const groups = useMemo(
    () => groupIcons(list.filter((icon) => matchesIcon(icon, query))),
    [list, query],
  )

  if (!isLoaded) {
    return <p className="block-menu__empty">Loading brand and AWS icons…</p>
  }
  if (groups.length === 0) {
    return hasOtherMatches ? null : (
      <p className="block-menu__empty">
        No icon matches. Try the custom block.
      </p>
    )
  }
  return groups.map(([name, icons]) => (
    <section key={name} className="block-menu__group">
      <p className="menu-label">{name}</p>
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
    </section>
  ))
}
