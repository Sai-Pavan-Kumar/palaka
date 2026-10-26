// Mirrors what worker/tracer.py `describe()` emits. Values arrive already
// shaped for drawing; the board never sees live Python objects.
export type ScalarValue = {
  t: 'none' | 'bool' | 'num' | 'str' | 'obj'
  r: string
}
export type SeqValue = {
  t: 'list' | 'tuple' | 'set' | 'deque'
  n: number
  items: PyValue[]
}
export type DictValue = { t: 'dict'; n: number; entries: [PyValue, PyValue][] }
export type ListNodeValue = {
  t: 'listnode'
  items: PyValue[]
  cycle: boolean
  more?: boolean
}
export type PyValue = ScalarValue | SeqValue | DictValue | ListNodeValue

export type TraceFrame = {
  fn: string
  line: number
  vars: Record<string, PyValue>
}

export type TraceStep = {
  line: number
  event: 'line' | 'return' | 'exception'
  frames: TraceFrame[]
  stdout: string
  ret?: PyValue
}

export type TraceError = { line: number | null; message: string }

export type TraceResult = {
  steps: TraceStep[]
  error: TraceError | null
  result: PyValue | null
  stdout: string
}
