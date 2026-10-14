import { SlidersHorizontal } from 'lucide-react'
import {
  DefaultDashStyle,
  DefaultFillStyle,
  useValue,
  type Editor,
  type StyleProp,
} from 'tldraw'
import { IconButton } from '../../shared/ui/IconButton'
import { Popover } from '../../shared/ui/Popover'
import { applyOpacity, applyStyle, useSharedValue } from './styleActions'

type Choice<T> = { value: T; label: string }

const FILLS: Choice<'none' | 'semi' | 'solid' | 'pattern'>[] = [
  { value: 'none', label: 'None' },
  { value: 'semi', label: 'Tint' },
  { value: 'solid', label: 'Solid' },
  { value: 'pattern', label: 'Hatch' },
]
const DASHES: Choice<'draw' | 'solid' | 'dashed' | 'dotted'>[] = [
  { value: 'draw', label: 'Hand' },
  { value: 'solid', label: 'Clean' },
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
            onClick={() => onPick(choice.value)}
          >
            {choice.label}
          </button>
        ))}
      </div>
    </>
  )
}

function StyleRow<T>({
  editor,
  title,
  style,
  choices,
}: {
  editor: Editor
  title: string
  style: StyleProp<T>
  choices: Choice<T>[]
}) {
  const current = useSharedValue(editor, style)
  return (
    <ChoiceRow
      title={title}
      choices={choices}
      current={current}
      onPick={(value) => applyStyle(editor, style, value)}
    />
  )
}

// Less-used styles live one click away, so the main bar stays calm.
export function MoreStylesMenu({ editor }: { editor: Editor }) {
  const opacity = useValue(
    'shared opacity',
    () => {
      const shared = editor.getSharedOpacity()
      return shared.type === 'shared' ? shared.value : undefined
    },
    [editor],
  )

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
          <StyleRow
            editor={editor}
            title="Fill"
            style={DefaultFillStyle}
            choices={FILLS}
          />
          <StyleRow
            editor={editor}
            title="Line"
            style={DefaultDashStyle}
            choices={DASHES}
          />
          <ChoiceRow
            title="Opacity"
            choices={OPACITIES}
            current={opacity}
            onPick={(value) => applyOpacity(editor, value)}
          />
        </div>
      )}
    </Popover>
  )
}
