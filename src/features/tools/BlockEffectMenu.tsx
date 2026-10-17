import {
  Activity,
  CircleOff,
  Flame,
  Sparkles,
  type LucideIcon,
} from 'lucide-react'
import { IconButton } from '../../shared/ui/IconButton'
import { Popover } from '../../shared/ui/Popover'
import { applyStyle } from '../engine/boardActions'
import type { BlockEffect } from '../engine/model/types'

type EffectChoice = {
  value: BlockEffect
  label: string
  icon: LucideIcon
}

const EFFECT_CHOICES: EffectChoice[] = [
  { value: 'none', label: 'No effect', icon: CircleOff },
  { value: 'glow', label: 'Glow (Active)', icon: Sparkles },
  { value: 'meteorite', label: 'Meteorite Beam', icon: Flame },
  { value: 'dash', label: 'Flow Border', icon: Activity },
]

const EFFECT_ICONS: Record<BlockEffect, LucideIcon> = {
  none: Sparkles,
  glow: Sparkles,
  meteorite: Flame,
  dash: Activity,
}

export function BlockEffectMenu({
  current = 'none',
}: {
  current?: BlockEffect
}) {
  const Icon = EFFECT_ICONS[current] ?? Sparkles
  const isActive = current !== 'none'

  return (
    <Popover
      side="below"
      trigger={({ toggle }) => (
        <IconButton
          icon={Icon}
          label={`Block animation: ${current}`}
          isActive={isActive}
          onClick={toggle}
        />
      )}
    >
      {(close) => (
        <div style={{ minWidth: 160 }}>
          {EFFECT_CHOICES.map((choice) => (
            <button
              key={choice.value}
              type="button"
              className={`menu-item ${choice.value === current ? 'is-active' : ''}`}
              onClick={() => {
                applyStyle({ effect: choice.value })
                close()
              }}
            >
              <choice.icon size={18} strokeWidth={1.75} aria-hidden />
              {choice.label}
            </button>
          ))}
        </div>
      )}
    </Popover>
  )
}
