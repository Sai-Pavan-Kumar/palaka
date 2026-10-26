import type { PyValue, TraceFrame, TraceStep } from '../run/traceTypes'

// Past this a value is cut with "…": the Variables panel is a slide, not a
// debugger, and one long list must not push every other row off the board.
const MAX_VALUE_CHARS = 36

function joinItems(items: PyValue[], total: number): string {
  const shown = items.map(formatValue).join(', ')
  return total > items.length ? `${shown}, …` : shown
}

export function formatValue(value: PyValue): string {
  switch (value.t) {
    case 'list':
      return `[${joinItems(value.items, value.n)}]`
    case 'tuple':
      return `(${joinItems(value.items, value.n)})`
    case 'deque':
      return `deque([${joinItems(value.items, value.n)}])`
    case 'set':
      return value.n === 0 ? 'set()' : `{${joinItems(value.items, value.n)}}`
    case 'dict': {
      const pairs = value.entries.map(
        ([k, v]) => `${formatValue(k)}: ${formatValue(v)}`,
      )
      return `{${pairs.join(', ')}${value.n > pairs.length ? ', …' : ''}}`
    }
    case 'listnode': {
      const chain = value.items.map(formatValue).join(' → ')
      if (value.cycle) return `${chain} → (cycle)`
      return value.more ? `${chain} → …` : `${chain} → None`
    }
    default:
      return value.r
  }
}

export function clipValue(text: string): string {
  return text.length > MAX_VALUE_CHARS
    ? `${text.slice(0, MAX_VALUE_CHARS - 1)}…`
    : text
}

export function currentFrame(step: TraceStep): TraceFrame | null {
  return step.frames.at(-1) ?? null
}

// A variable "changed" only inside the same call: entering a new function
// would otherwise flash every argument, which says nothing.
export function changedNames(
  previous: TraceStep | undefined,
  step: TraceStep,
): Set<string> {
  const changed = new Set<string>()
  const now = currentFrame(step)
  const before = previous && currentFrame(previous)
  if (!now || !before || before.fn !== now.fn) return changed
  if (previous.frames.length !== step.frames.length) return changed
  for (const [name, value] of Object.entries(now.vars)) {
    const old = before.vars[name]
    if (!old || formatValue(old) !== formatValue(value)) changed.add(name)
  }
  return changed
}

export function outputLines(stdout: string, maxLines: number): string[] {
  const lines = stdout.replace(/\n$/, '').split('\n')
  if (stdout === '') return []
  return lines.slice(-maxLines)
}
