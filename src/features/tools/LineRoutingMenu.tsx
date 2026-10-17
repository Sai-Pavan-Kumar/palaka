import { CornerDownRight, Minus, Spline, type LucideIcon } from 'lucide-react'
import { IconButton } from '../../shared/ui/IconButton'
import { Popover } from '../../shared/ui/Popover'
import { applyStyle } from '../engine/boardActions'
import type { LineRouting } from '../engine/model/types'

type RoutingChoice = {
  value: LineRouting
  label: string
  icon: LucideIcon
}

const ROUTING_CHOICES: RoutingChoice[] = [
  { value: 'straight', label: 'Straight', icon: Minus },
  { value: 'elbow', label: 'Elbow (90°)', icon: CornerDownRight },
  { value: 'curved', label: 'Curved', icon: Spline },
]

const ROUTING_ICONS: Record<LineRouting, LucideIcon> = {
  straight: Minus,
  elbow: CornerDownRight,
  curved: Spline,
}

export function LineRoutingMenu({
  current = 'straight',
}: {
  current?: LineRouting
}) {
  const Icon = ROUTING_ICONS[current] ?? Minus

  return (
    <Popover
      side="below"
      trigger={({ toggle }) => (
        <IconButton
          icon={Icon}
          label={`Connector routing: ${current}`}
          isActive={current !== 'straight'}
          onClick={toggle}
        />
      )}
    >
      {(close) => (
        <div style={{ minWidth: 150 }}>
          {ROUTING_CHOICES.map((choice) => (
            <button
              key={choice.value}
              type="button"
              className={`menu-item ${choice.value === current ? 'is-active' : ''}`}
              onClick={() => {
                applyStyle({ routing: choice.value })
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
