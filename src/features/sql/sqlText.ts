// Low-level text helpers for the SQL reader. They walk the text once and
// respect quotes, so a ";" or "," inside 'text', "names" or `names` never
// splits anything.

const QUOTES: Record<string, string> = {
  "'": "'",
  '"': '"',
  '`': '`',
  '[': ']',
}

type Visitor = (char: string, index: number, depth: number) => void

// Calls `visit` for every character outside quotes, with the bracket depth.
function walk(text: string, visit: Visitor): void {
  let depth = 0
  let closing: string | null = null
  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    if (closing) {
      if (char === closing) closing = null
      continue
    }
    if (char in QUOTES) {
      closing = QUOTES[char]
      continue
    }
    if (char === '(') depth++
    visit(char, i, depth)
    if (char === ')') depth--
  }
}

export function stripComments(sql: string): string {
  let out = ''
  let closing: string | null = null
  for (let i = 0; i < sql.length; i++) {
    const char = sql[i]
    if (closing) {
      out += char
      if (char === closing) closing = null
    } else if (char in QUOTES) {
      closing = QUOTES[char]
      out += char
    } else if (char === '-' && sql[i + 1] === '-') {
      while (i < sql.length && sql[i] !== '\n') i++
      out += '\n'
    } else if (char === '/' && sql[i + 1] === '*') {
      const end = sql.indexOf('*/', i + 2)
      i = end === -1 ? sql.length : end + 1
      out += ' '
    } else {
      out += char
    }
  }
  return out
}

// Splits on `separator` at bracket depth 0, or at any depth when
// `anyDepth` is set (statements: one missing ")" must not swallow the rest).
export function splitTopLevel(
  text: string,
  separator: string,
  anyDepth = false,
): string[] {
  const parts: string[] = []
  let start = 0
  walk(text, (char, index, depth) => {
    if (char === separator && (anyDepth || depth === 0)) {
      parts.push(text.slice(start, index))
      start = index + 1
    }
  })
  parts.push(text.slice(start))
  return parts.map((part) => part.trim()).filter(Boolean)
}

// The text inside the first top-level "( … )", or null when unbalanced.
export function firstParenBody(text: string): string | null {
  let open = -1
  let close = -1
  walk(text, (char, index, depth) => {
    if (char === '(' && depth === 1 && open === -1) open = index
    if (char === ')' && depth === 1 && open !== -1 && close === -1) {
      close = index
    }
  })
  return open !== -1 && close !== -1 ? text.slice(open + 1, close) : null
}

// One identifier, maybe quoted, maybe schema-qualified ("public"."users").
export const IDENT = String.raw`(?:"[^"]+"|\x60[^\x60]+\x60|\[[^\]]+\]|[\w$]+)(?:\s*\.\s*(?:"[^"]+"|\x60[^\x60]+\x60|\[[^\]]+\]|[\w$]+))*`

// Drops quotes and the schema part: public."Orders" → Orders.
export function cleanIdentifier(raw: string): string {
  const last = raw.split('.').pop() ?? raw
  return last.trim().replace(/^["`[]|["`\]]$/g, '')
}

export function identifierList(raw: string): string[] {
  return splitTopLevel(raw, ',').map(cleanIdentifier)
}
