type SelectFieldProps<Value extends string | number> = {
  label: string
  value: Value
  options: readonly Value[]
  formatOption?: (option: Value) => string
  disabled: boolean
  onChange: (value: Value) => void
}

export function SelectField<Value extends string | number>({
  label,
  value,
  options,
  formatOption = String,
  disabled,
  onChange,
}: SelectFieldProps<Value>) {
  // <select> only speaks strings, so map back to the original typed option.
  const handleChange = (rawValue: string) => {
    const picked = options.find((option) => String(option) === rawValue)
    if (picked !== undefined) onChange(picked)
  }

  return (
    <label className="recorder__field">
      {label}
      <select
        value={String(value)}
        disabled={disabled}
        onChange={(event) => handleChange(event.target.value)}
      >
        {options.map((option) => (
          <option key={option} value={String(option)}>
            {formatOption(option)}
          </option>
        ))}
      </select>
    </label>
  )
}
