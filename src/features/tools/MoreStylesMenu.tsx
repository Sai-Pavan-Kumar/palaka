import { SlidersHorizontal } from 'lucide-react'
import { IconButton } from '../../shared/ui/IconButton'
import { Popover } from '../../shared/ui/Popover'
import { applyStyle } from '../engine/boardActions'
import type { DashStyle, FillStyle } from '../engine/model/types'
import type { ShownStyle } from './styleActions'

type Choice<T> = { value: T; label: string }

const FILLS: Choice<FillStyle>[] = [
  { value: 'none', label: 'None' },
  { value: 'tint', label: 'Tint' },
  { value: 'solid', label: 'Solid' },
  { value: 'hatch', label: 'Hatch' },
]
const DASHES: Choice<DashStyle>[] = [
  { value: 'hand', label: 'Hand' },
  { value: 'clean', label: 'Clean' },
  { value: 'dashed', label: 'Dashed' },
  { value: 'dotted', label: 'Dotted' },
]
const OPACITIES: Choice<number>[] = [
  { value: 0.25, label: '25%' },
  { value: 0.5, label: '50%' },
  { value: 0.75, label: '75%' },
  { value: 1, label: '100%' },
]

function ChoiceRow<T>({
  title,
  choices,
  current,
  onPick,
}: {
  title: string
  choices: Choice<T>[]
  current: T | undefined
  onPick: (value: T) => void
}) {
  return (
    <>
      <p className="menu-label">{title}</p>
      <div className="chip-row">
        {choices.map((choice) => (
          <button
            key={String(choice.value)}
            type="button"
            className={`chip ${current === choice.value ? 'is-active' : ''}`}
            aria-pressed={current === choice.value}
            onClick={() => onPick(choice.value)}
          >
            {choice.label}
          </button>
        ))}
      </div>
    </>
  )
}

// Less-used styles live one click away, so the main bar stays calm.
export function MoreStylesMenu({ shown }: { shown: ShownStyle }) {
  const { fields, values } = shown
  return (
    <Popover
      align="end"
      trigger={({ toggle }) => (
        <IconButton
          icon={SlidersHorizontal}
          label="More styles: fill, line, opacity"
          onClick={toggle}
        />
      )}
    >
      {() => (
        <div className="more-styles">
          {fields.has('fill') && (
            <ChoiceRow
              title="Fill"
              choices={FILLS}
              current={values.fill}
              onPick={(fill) => applyStyle({ fill })}
            />
          )}
          {fields.has('dash') && (
            <ChoiceRow
              title="Line"
              choices={DASHES}
              current={values.dash}
              onPick={(dash) => applyStyle({ dash })}
            />
          )}
          <ChoiceRow
            title="Opacity"
            choices={OPACITIES}
            current={values.opacity}
            onPick={(opacity) => applyStyle({ opacity })}
          />
        </div>
      )}
    </Popover>
  )
}
