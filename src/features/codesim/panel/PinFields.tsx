import type { CodePins } from '../../engine/model/types'

function toNames(text: string): string[] {
  return text
    .split(/[\s,]+/)
    .map((name) => name.trim())
    .filter((name) => /^[A-Za-z_]\w*$/.test(name))
}

function PinInput({
  label,
  value,
  placeholder,
  onChange,
}: {
  label: string
  value: string[]
  placeholder: string
  onChange: (names: string[]) => void
}) {
  return (
    <label className="code-panel__call">
      <span className="menu-label">{label}</span>
      <input
        defaultValue={value.join(', ')}
        spellCheck={false}
        placeholder={placeholder}
        onChange={(event) => onChange(toNames(event.target.value))}
      />
    </label>
  )
}

// Folded away by default: the guess is right for most interview code, and
// the panel should stay "paste, run" until it is not.
export function PinFields({
  pins,
  onChange,
}: {
  pins: CodePins
  onChange: (pins: CodePins) => void
}) {
  const isPinned = pins.arrays.length > 0 || pins.pointers.length > 0
  return (
    <details className="code-panel__pins" open={isPinned}>
      <summary>Choose what to draw</summary>
      <PinInput
        label="Show as array"
        value={pins.arrays}
        placeholder="Auto (e.g. nums)"
        onChange={(arrays) => onChange({ ...pins, arrays })}
      />
      <PinInput
        label="Pointers"
        value={pins.pointers}
        placeholder="Auto (e.g. lo, hi, mid)"
        onChange={(pointers) => onChange({ ...pins, pointers })}
      />
    </details>
  )
}
