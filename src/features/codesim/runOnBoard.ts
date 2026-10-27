import type { CodePins, TextShape } from '../engine/model/types'
import { placeCard, runKeyOf } from './codeCard'
import { useCodeSimStore } from './codeSimStore'
import { runCode } from './run/runClient'

async function executeRun(cardId: string, source: string, call: string) {
  const runKey = runKeyOf(source, call)
  useCodeSimStore.setState({
    status: 'loading',
    cardId,
    runKey,
    steps: [],
    index: 0,
    error: null,
    result: null,
  })
  try {
    const trace = await runCode(source, call, () =>
      useCodeSimStore.setState({ status: 'running' }),
    )
    // A newer run may have started meanwhile; its result wins.
    if (useCodeSimStore.getState().runKey !== runKey) return
    useCodeSimStore.setState({
      status: trace.error ? 'error' : 'ready',
      steps: trace.steps,
      index: 0,
      error: trace.error,
      result: trace.result,
    })
  } catch (failure) {
    const message = failure instanceof Error ? failure.message : String(failure)
    useCodeSimStore.setState({
      status: 'error',
      error: { line: null, message },
    })
  }
}

export async function runOnBoard(
  source: string,
  call: string,
  pins: CodePins,
): Promise<void> {
  const cardId = placeCard(source, call, pins)
  await executeRun(cardId, source, call)
}

// Called when presenting starts: the run is computed before the card is
// revealed, so the first Space on it never waits for Python. A run that
// is already current is just rewound to its first line.
export function prepareCodeRun(card: TextShape): void {
  const state = useCodeSimStore.getState()
  const runKey = runKeyOf(card.text, card.codeCall ?? '')
  if (state.cardId === card.id && state.runKey === runKey) {
    useCodeSimStore.setState({ index: 0 })
    return
  }
  void executeRun(card.id, card.text, card.codeCall ?? '')
}
