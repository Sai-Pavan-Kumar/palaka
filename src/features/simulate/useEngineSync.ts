import { useEffect, useRef } from 'react'
import type { SimEngine } from './simEngine'
import { useSimStore } from './simStore'

// Calls a handler when a counter changes, but not for the value it had
// when the runner mounted (a fresh run should not replay old clicks).
function useOnBump(value: number, handler: () => void): void {
  const seen = useRef(value)
  useEffect(() => {
    if (value === seen.current) return
    seen.current = value
    handler()
  }, [value, handler])
}

// The bar's buttons live outside the board; this carries each one into
// the engine running inside it.
export function useEngineSync(engine: SimEngine): void {
  const traffic = useSimStore((s) => s.traffic)
  const stepMode = useSimStore((s) => s.stepMode)
  const down = useSimStore((s) => s.down)
  const runId = useSimStore((s) => s.runId)
  const sendId = useSimStore((s) => s.sendId)
  const nextId = useSimStore((s) => s.nextId)

  useEffect(() => engine.setTraffic(traffic), [engine, traffic])
  useEffect(() => engine.setStepMode(stepMode), [engine, stepMode])
  useEffect(() => engine.setDown(new Set(down)), [engine, down])
  useOnBump(runId, () => engine.reset())
  useOnBump(sendId, () => engine.sendOne())
  useOnBump(nextId, () => engine.next())
}
