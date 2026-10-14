import type { ComponentType, ReactNode } from 'react'
import type { LucideProps } from 'lucide-react'
import './ui.css'

type IconButtonProps = {
  icon: ComponentType<LucideProps>
  label: string
  shortcut?: string
  isActive?: boolean
  disabled?: boolean
  tone?: 'default' | 'danger'
  tooltipSide?: 'below' | 'above' | 'right'
  onClick: () => void
  children?: ReactNode
}

// One icon style everywhere; the name appears on hover, never as permanent text.
export function IconButton({
  icon: Icon,
  label,
  shortcut,
  isActive = false,
  disabled = false,
  tone = 'default',
  tooltipSide = 'below',
  onClick,
  children,
}: IconButtonProps) {
  const tooltip = shortcut ? `${label}  ${shortcut}` : label
  return (
    <button
      type="button"
      className={`icon-button tone-${tone} ${isActive ? 'is-active' : ''}`}
      aria-label={label}
      aria-pressed={isActive}
      data-tooltip={tooltip}
      data-tooltip-side={tooltipSide}
      disabled={disabled}
      onClick={onClick}
    >
      <Icon size={20} strokeWidth={1.75} aria-hidden />
      {children}
    </button>
  )
}
