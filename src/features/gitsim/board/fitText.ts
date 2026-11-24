// The board fonts are close enough to fixed width that a character budget
// keeps text inside its box without measuring the DOM, which would make
// layout depend on rendering and break the pure step snapshots.
export const CHAR_WIDTH = {
  // Geist Mono is about 0.6em wide; Gaegu runs a little narrower.
  code: 0.6,
  brand: 0.46,
}

export function charsThatFit(width: number, fontSize: number, ratio: number) {
  return Math.max(1, Math.floor(width / (fontSize * ratio)))
}

export function clip(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text
  return maxChars <= 1 ? '…' : `${text.slice(0, maxChars - 1)}…`
}

// Breaks on spaces; the last allowed line is clipped if words remain.
export function wrap(
  text: string,
  maxChars: number,
  maxLines: number,
): string[] {
  const lines: string[] = []
  let line = ''
  for (const word of text.split(' ')) {
    const next = line ? `${line} ${word}` : word
    if (next.length <= maxChars || !line) {
      line = next
      continue
    }
    lines.push(line)
    line = word
  }
  if (line) lines.push(line)
  const kept = lines.slice(0, maxLines).map((l) => clip(l, maxChars))
  if (lines.length > maxLines) {
    const last = kept[maxLines - 1]
    kept[maxLines - 1] = `${last.slice(0, maxChars - 1)}…`
  }
  return kept
}
