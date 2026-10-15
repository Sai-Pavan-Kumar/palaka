// WHERE / HAVING conditions: a small recursive-descent parser and evaluator.
// Values on the board are text, so comparisons are numeric when both sides
// look like numbers and text otherwise, which matches what a viewer expects.

export type Row = Record<string, string | null>

export type Expr =
  | { kind: 'and' | 'or'; left: Expr; right: Expr }
  | { kind: 'not'; inner: Expr }
  | { kind: 'compare'; op: string; left: Operand; right: Operand }
  | { kind: 'like'; left: Operand; pattern: string; negate: boolean }
  | { kind: 'in'; left: Operand; values: Operand[]; negate: boolean }
  | { kind: 'isNull'; left: Operand; negate: boolean }

export type Operand = { column: string } | { value: string | null }

const TOKEN =
  /\s*(<=|>=|<>|!=|=|<|>|\(|\)|,|'(?:[^']|'')*'|-?\d+(?:\.\d+)?|[\w$."`[\]]+)/y

export function tokenize(text: string): string[] {
  const tokens: string[] = []
  TOKEN.lastIndex = 0
  let match: RegExpExecArray | null
  while (TOKEN.lastIndex < text.length && (match = TOKEN.exec(text))) {
    tokens.push(match[1])
  }
  if (TOKEN.lastIndex < text.trimEnd().length) {
    throw new Error(`Could not read "${text.slice(TOKEN.lastIndex).trim()}"`)
  }
  return tokens
}

const isWord = (token: string | undefined, word: string) =>
  token?.toLowerCase() === word

class ExprParser {
  private index = 0
  private tokens: string[]

  constructor(tokens: string[]) {
    this.tokens = tokens
  }

  parse(): Expr {
    const expr = this.or()
    if (this.index < this.tokens.length) {
      throw new Error(`Unexpected "${this.tokens[this.index]}"`)
    }
    return expr
  }

  private peek() {
    return this.tokens[this.index]
  }

  private next() {
    return this.tokens[this.index++]
  }

  private or(): Expr {
    let left = this.and()
    while (isWord(this.peek(), 'or')) {
      this.next()
      left = { kind: 'or', left, right: this.and() }
    }
    return left
  }

  private and(): Expr {
    let left = this.not()
    while (isWord(this.peek(), 'and')) {
      this.next()
      left = { kind: 'and', left, right: this.not() }
    }
    return left
  }

  private not(): Expr {
    if (isWord(this.peek(), 'not')) {
      this.next()
      return { kind: 'not', inner: this.not() }
    }
    if (this.peek() === '(') {
      this.next()
      const inner = this.or()
      if (this.next() !== ')') throw new Error('Missing ")"')
      return inner
    }
    return this.predicate()
  }

  private predicate(): Expr {
    const left = this.operand()
    const negate = isWord(this.peek(), 'not')
    if (negate) this.next()
    const op = this.next()?.toLowerCase()
    if (op === 'like') {
      const pattern = this.operand()
      if (!('value' in pattern) || pattern.value === null) {
        throw new Error('LIKE needs a text pattern')
      }
      return { kind: 'like', left, pattern: pattern.value, negate }
    }
    if (op === 'in') return { kind: 'in', left, values: this.list(), negate }
    if (op === 'is') {
      const isNot = isWord(this.peek(), 'not')
      if (isNot) this.next()
      if (!isWord(this.next(), 'null')) throw new Error('Expected IS NULL')
      return { kind: 'isNull', left, negate: isNot }
    }
    if (
      !op ||
      negate ||
      !['=', '<>', '!=', '<', '<=', '>', '>='].includes(op)
    ) {
      throw new Error(`Unsupported condition near "${op ?? ''}"`)
    }
    return { kind: 'compare', op, left, right: this.operand() }
  }

  private list(): Operand[] {
    if (this.next() !== '(') throw new Error('IN needs ( … )')
    const values = [this.operand()]
    while (this.peek() === ',') {
      this.next()
      values.push(this.operand())
    }
    if (this.next() !== ')') throw new Error('Missing ")" after IN list')
    return values
  }

  private operand(): Operand {
    const token = this.next()
    if (token === undefined) throw new Error('Condition ends too early')
    if (/^'/.test(token))
      return { value: token.slice(1, -1).replace(/''/g, "'") }
    if (/^-?\d/.test(token)) return { value: token }
    if (isWord(token, 'null')) return { value: null }
    if (isWord(token, 'true') || isWord(token, 'false')) return { value: token }
    return { column: columnName(token) }
  }
}

// Preserves qualified names like "u.id" or "orders.total" in lowercase.
export function columnName(token: string): string {
  return token.replace(/["`[\]]/g, '').toLowerCase()
}

export function parseExpr(text: string): Expr {
  return new ExprParser(tokenize(text)).parse()
}

function valueOf(operand: Operand, row: Row): string | null {
  if ('value' in operand) return operand.value
  const col = operand.column
  if (col in row) return row[col]
  const dot = col.lastIndexOf('.')
  if (dot !== -1) {
    const unqualified = col.slice(dot + 1)
    if (unqualified in row) return row[unqualified]
  } else {
    const suffix = `.${col}`
    const matches = Object.keys(row).filter(
      (k) => k === col || k.endsWith(suffix),
    )
    if (matches.length === 1) return row[matches[0]]
    if (matches.length > 1) throw new Error(`Ambiguous column "${col}"`)
  }
  throw new Error(`No column "${col}"`)
}

export function compareValues(a: string, b: string): number {
  const x = Number(a)
  const y = Number(b)
  if (a.trim() !== '' && b.trim() !== '' && !isNaN(x) && !isNaN(y)) return x - y
  return a.localeCompare(b)
}

function likeToRegex(pattern: string): RegExp {
  const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`^${escaped.replace(/%/g, '.*').replace(/_/g, '.')}$`, 'i')
}

// SQL's three-valued logic is simplified: anything compared with NULL is
// false, which is what the viewer sees (the row drops out).
export function evaluate(expr: Expr, row: Row): boolean {
  switch (expr.kind) {
    case 'and':
      return evaluate(expr.left, row) && evaluate(expr.right, row)
    case 'or':
      return evaluate(expr.left, row) || evaluate(expr.right, row)
    case 'not':
      return !evaluate(expr.inner, row)
    case 'isNull':
      return (valueOf(expr.left, row) === null) !== expr.negate
    case 'like': {
      const value = valueOf(expr.left, row)
      if (value === null) return false
      return likeToRegex(expr.pattern).test(value) !== expr.negate
    }
    case 'in': {
      const value = valueOf(expr.left, row)
      if (value === null) return false
      const hit = expr.values.some((v) => valueOf(v, row) === value)
      return hit !== expr.negate
    }
    case 'compare': {
      const a = valueOf(expr.left, row)
      const b = valueOf(expr.right, row)
      if (a === null || b === null) return false
      const diff = compareValues(a, b)
      const ops: Record<string, boolean> = {
        '=': diff === 0,
        '<>': diff !== 0,
        '!=': diff !== 0,
        '<': diff < 0,
        '<=': diff <= 0,
        '>': diff > 0,
        '>=': diff >= 0,
      }
      return ops[expr.op]
    }
  }
}
