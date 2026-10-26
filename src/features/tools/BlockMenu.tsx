import { Server } from 'lucide-react'
import { useState } from 'react'
import { IconButton } from '../../shared/ui/IconButton'
import { Popover } from '../../shared/ui/Popover'
import {
  BLOCK_GROUPS,
  BLOCK_NAMES,
  matchesBlockQuery,
  type BlockGroup,
} from '../engine/model/blockCatalog'
import type { BlockKind } from '../engine/model/types'
import { BLOCK_ICONS } from '../engine/render/blockIcons'
import { setSession, setTool, useSessionStore } from '../engine/sessionStore'
import { IconLibraryGroups } from '../icons/IconLibraryGroups'
import { TemplateList } from '../templates/TemplateList'
import type { LibraryIcon } from '../icons/iconTypes'
import './blockMenu.css'

function pickBlock(kind: BlockKind) {
  setSession({ blockKind: kind, blockIcon: null })
  setTool('block')
}

function pickIcon(icon: LibraryIcon) {
  setSession({
    blockKind: icon.kind,
    blockIcon: { id: icon.id, label: icon.label },
  })
  setTool('block')
}

// Blueprint blocks behind one button. Grouped the way a request travels
// (client → edge → compute → data); with 60+ blocks, typing beats
// scanning, so a search box sits on top and Enter takes the first match.
export function BlockMenu() {
  const isActive = useSessionStore((s) => s.tool === 'block')
  const blockKind = useSessionStore((s) => s.blockKind)
  const blockIcon = useSessionStore((s) => s.blockIcon)

  return (
    <Popover
      trigger={({ toggle }) => (
        <IconButton
          icon={isActive ? BLOCK_ICONS[blockKind] : Server}
          label="Blueprint blocks"
          shortcut="B"
          isActive={isActive}
          onClick={() => {
            if (isActive) setTool('select')
            else toggle()
          }}
        />
      )}
    >
      {(close) => (
        <BlockPicker
          current={isActive && !blockIcon ? blockKind : null}
          currentIcon={isActive ? (blockIcon?.id ?? null) : null}
          onPick={(kind) => {
            if (isActive && kind === blockKind && !blockIcon) setTool('select')
            else pickBlock(kind)
            close()
          }}
          onPickIcon={(icon) => {
            pickIcon(icon)
            close()
          }}
          onClose={close}
        />
      )}
    </Popover>
  )
}

function BlockSearch({
  query,
  onChange,
  onEnter,
}: {
  query: string
  onChange: (query: string) => void
  onEnter: () => void
}) {
  return (
    <input
      className="block-menu__search"
      type="search"
      placeholder="Search 500+ icons (redis, kafka, s3…)"
      aria-label="Search blocks"
      autoFocus
      value={query}
      onChange={(event) => onChange(event.target.value)}
      onKeyDown={(event) => {
        if (event.key === 'Enter') onEnter()
      }}
    />
  )
}

function BlockPicker({
  current,
  currentIcon,
  onPick,
  onPickIcon,
  onClose,
}: {
  current: BlockKind | null
  currentIcon: string | null
  onPick: (kind: BlockKind) => void
  onPickIcon: (icon: LibraryIcon) => void
  onClose: () => void
}) {
  const [query, setQuery] = useState('')
  const groups = BLOCK_GROUPS.map((group) => ({
    ...group,
    kinds: group.kinds.filter((kind) => matchesBlockQuery(kind, query)),
  })).filter((group) => group.kinds.length > 0)
  const firstMatch = groups[0]?.kinds[0]

  return (
    <div className="block-menu">
      <BlockSearch
        query={query}
        onChange={setQuery}
        onEnter={() => firstMatch && onPick(firstMatch)}
      />
      <TemplateList query={query} onDone={onClose} />
      {groups.map((group) => (
        <BlockGroupGrid
          key={group.name}
          group={group}
          current={current}
          onPick={onPick}
        />
      ))}
      <IconLibraryGroups
        query={query}
        currentId={currentIcon}
        hasOtherMatches={groups.length > 0}
        onPick={onPickIcon}
      />
    </div>
  )
}

function BlockGroupGrid({
  group,
  current,
  onPick,
}: {
  group: BlockGroup
  current: BlockKind | null
  onPick: (kind: BlockKind) => void
}) {
  return (
    <section className="block-menu__group">
      <p className="menu-label">{group.name}</p>
      <div className="block-menu__grid">
        {group.kinds.map((kind) => {
          const Icon = BLOCK_ICONS[kind]
          return (
            <button
              key={kind}
              type="button"
              className={`menu-item block-menu__item ${kind === current ? 'is-active' : ''}`}
              onClick={() => onPick(kind)}
            >
              <Icon size={18} strokeWidth={1.75} aria-hidden />
              {BLOCK_NAMES[kind]}
            </button>
          )
        })}
      </div>
    </section>
  )
}
