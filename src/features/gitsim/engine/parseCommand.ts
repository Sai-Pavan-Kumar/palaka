// Splits a script line like a shell would for the cases a lesson uses:
// spaces separate words, and "double" or 'single' quotes keep spaces in.
export function tokenize(line: string): string[] {
  const words: string[] = []
  const pattern = /"([^"]*)"|'([^']*)'|(\S+)/g
  for (const match of line.matchAll(pattern)) {
    words.push(match[1] ?? match[2] ?? match[3])
  }
  return words
}

export function isSkippedLine(line: string): boolean {
  const trimmed = line.trim()
  return trimmed === '' || trimmed.startsWith('#')
}

export type ParsedArgs = {
  flags: Set<string>
  values: Record<string, string>
  positional: string[]
}

// `valueFlags` take the next word (or `-m"msg"` glued forms are not used in
// lessons, so they are not supported). Combined short flags such as -am are
// split into -a and -m.
export function parseArgs(args: string[], valueFlags: string[]): ParsedArgs {
  const parsed: ParsedArgs = { flags: new Set(), values: {}, positional: [] }
  for (let i = 0; i < args.length; i += 1) {
    const word = args[i]
    if (!word.startsWith('-') || word === '-') {
      parsed.positional.push(word)
      continue
    }
    const shortGroup = /^-[a-zA-Z]{2,}$/.test(word)
    const flags = shortGroup ? [...word.slice(1)].map((c) => `-${c}`) : [word]
    for (const flag of flags) {
      if (valueFlags.includes(flag) && i + 1 < args.length) {
        i += 1
        parsed.values[flag] = args[i]
      } else {
        parsed.flags.add(flag)
      }
    }
  }
  return parsed
}
