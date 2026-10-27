import {
  Focus,
  Keyboard,
  Sparkles,
  TrendingUp,
  type LucideIcon,
} from 'lucide-react'
import { IconButton } from '../../shared/ui/IconButton'
import { Popover } from '../../shared/ui/Popover'
import { applyStyle } from '../engine/boardActions'
import type { TextAnimation, TextReveal } from '../engine/model/types'
import './textAnimationMenu.css'

type AnimOption = {
  id: TextAnimation
  label: string
  desc: string
  icon: LucideIcon
}

const ANIM_OPTIONS: AnimOption[] = [
  {
    id: 'wipe',
    label: 'Smooth Wipe',
    desc: 'Clean left-to-right progressive sweep',
    icon: Sparkles,
  },
  {
    id: 'typewriter',
    label: 'Typewriter',
    desc: 'Dynamic stepped typing cadence',
    icon: Keyboard,
  },
  {
    id: 'slide-up',
    label: 'Slide & Rise',
    desc: 'Cinematic upward glide into place',
    icon: TrendingUp,
  },
  {
    id: 'blur-in',
    label: 'Optics Focus',
    desc: 'Apple-style blur-to-focus resolve',
    icon: Focus,
  },
]

function AnimMenuItem({
  option,
  current,
  onSelect,
}: {
  option: AnimOption
  current: TextAnimation
  onSelect: (id: TextAnimation) => void
}) {
  const Icon = option.icon
  const isActive = option.id === current
  return (
    <button
      type="button"
      className={`text-anim-menu__item ${isActive ? 'is-active' : ''}`}
      onClick={() => onSelect(option.id)}
    >
      <Icon size={16} strokeWidth={1.75} aria-hidden />
      <div className="text-anim-menu__info">
        <span className="text-anim-menu__title">{option.label}</span>
        <span className="text-anim-menu__desc">{option.desc}</span>
      </div>
    </button>
  )
}

const REVEAL_OPTIONS: { id: TextReveal; label: string }[] = [
  { id: 'word', label: 'Word by word' },
  { id: 'whole', label: 'All at once' },
]

// Word by word is the default; "All at once" is the old whole-box reveal.
function RevealToggle({ current }: { current: TextReveal }) {
  return (
    <div className="text-anim-menu__reveal" role="group" aria-label="Reveal">
      {REVEAL_OPTIONS.map((option) => (
        <button
          key={option.id}
          type="button"
          className={`text-anim-menu__chip ${option.id === current ? 'is-active' : ''}`}
          aria-pressed={option.id === current}
          onClick={() => applyStyle({ textReveal: option.id })}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

export function TextAnimationMenu({
  current = 'wipe',
  reveal = 'word',
}: {
  current?: TextAnimation
  reveal?: TextReveal
}) {
  const activeOpt =
    ANIM_OPTIONS.find((opt) => opt.id === current) ?? ANIM_OPTIONS[0]
  const TriggerIcon = activeOpt.icon

  return (
    <Popover
      trigger={({ toggle }) => (
        <IconButton
          icon={TriggerIcon}
          label={`Text animation: ${activeOpt.label}`}
          isActive
          onClick={toggle}
        />
      )}
    >
      {(close) => (
        <div className="text-anim-menu" role="menu">
          {ANIM_OPTIONS.map((opt) => (
            <AnimMenuItem
              key={opt.id}
              option={opt}
              current={current}
              onSelect={(id) => {
                applyStyle({ textAnimation: id })
                close()
              }}
            />
          ))}
          <RevealToggle current={reveal} />
        </div>
      )}
    </Popover>
  )
}
