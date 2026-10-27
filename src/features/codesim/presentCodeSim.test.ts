import { beforeEach, describe, expect, it } from 'vitest'
import { useEngineStore } from '../engine/engineStore'
import { createEmptyDocument } from '../engine/model/documentOps'
import type { TextShape } from '../engine/model/types'
import { setSession } from '../engine/sessionStore'
import { runKeyOf } from './codeCard'
import { useCodeSimStore } from './codeSimStore'
import { handlePresentCodeKey } from './presentCodeSim'
import type { TraceStep } from './run/traceTypes'

const STEP: TraceStep = { line: 1, event: 'line', frames: [], stdout: '' }

function card(stepThrough: boolean): TextShape {
  return {
    id: 'card',
    type: 'text',
    x: 0,
    y: 0,
    text: 'x = 1',
    font: 'code',
    size: 's',
    scale: 1,
    color: 'black',
    opacity: 1,
    revealStep: 1,
    codeCall: '',
    codeStepThrough: stepThrough,
  }
}

function setup(stepThrough: boolean, shownUpTo: number) {
  const doc = createEmptyDocument()
  const page = doc.pages[0]
  const code = card(stepThrough)
  doc.pages[0] = { ...page, shapes: { card: code }, order: ['card'] }
  useEngineStore.setState({ doc })
  setSession({
    pageId: page.id,
    presenting: true,
    revealedUpTo: { [page.id]: shownUpTo },
  })
  useCodeSimStore.setState({
    status: 'ready',
    cardId: 'card',
    runKey: runKeyOf(code.text, ''),
    steps: [STEP, STEP, STEP],
    index: 0,
  })
}

const index = () => useCodeSimStore.getState().index

describe('handlePresentCodeKey', () => {
  beforeEach(() => setup(true, 1))

  it('steps the code, then hands Space back to the reveal at the end', () => {
    expect(handlePresentCodeKey(1)).toBe(true)
    expect(handlePresentCodeKey(1)).toBe(true)
    expect(index()).toBe(2)
    expect(handlePresentCodeKey(1)).toBe(false)
  })

  it('steps back, then hands back to the reveal at line one', () => {
    useCodeSimStore.setState({ index: 1 })
    expect(handlePresentCodeKey(-1)).toBe(true)
    expect(handlePresentCodeKey(-1)).toBe(false)
  })

  it('leaves a switched-off card as a plain object', () => {
    setup(false, 1)
    expect(handlePresentCodeKey(1)).toBe(false)
    expect(index()).toBe(0)
  })

  it('ignores the card until it is revealed', () => {
    setup(true, 0)
    expect(handlePresentCodeKey(1)).toBe(false)
  })

  it('never steps a run made for older code', () => {
    useCodeSimStore.setState({ runKey: runKeyOf('old code', '') })
    expect(handlePresentCodeKey(1)).toBe(false)
  })

  it('holds Space while Python is still warming up', () => {
    useCodeSimStore.setState({ status: 'loading' })
    expect(handlePresentCodeKey(1)).toBe(true)
    expect(index()).toBe(0)
  })
})
