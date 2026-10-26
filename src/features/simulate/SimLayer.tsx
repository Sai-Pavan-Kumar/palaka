import { useEffect, useMemo, useState } from 'react'
import { getPalette } from '../engine/model/paper'
import type { Page, Paper, Shape } from '../engine/model/types'
import { buildSimGraph } from './simGraph'
import { SimEngine } from './simEngine'
import { useSimStore } from './simStore'
import { Meters, Packets, Tags } from './SimVisuals'
import './simulate.css'
import { useEngineSync } from './useEngineSync'

const ALL = () => true

function prefersReducedMotion(): boolean {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
}

// One frame clock for the whole run. The engine itself is plain data, so a
// re-render just reads it; nothing here is stored in the document.
function useSimClock(engine: SimEngine, playing: boolean): void {
  const [, setFrame] = useState(0)
  useEffect(() => {
    if (!playing) return
    let last = performance.now()
    let id = requestAnimationFrame(function tick(now) {
      engine.advance((now - last) / 1000)
      last = now
      setFrame((frame) => frame + 1)
      id = requestAnimationFrame(tick)
    })
    return () => cancelAnimationFrame(id)
  }, [engine, playing])
}

function SimRunner({
  page,
  paper,
  isVisible,
}: {
  page: Page
  paper: Paper
  isVisible: (shape: Shape) => boolean
}) {
  const playing = useSimStore((s) => s.playing)
  const graph = useMemo(() => buildSimGraph(page, isVisible), [page, isVisible])
  const [engine] = useState(() => new SimEngine(graph))

  useEffect(() => engine.setGraph(graph), [engine, graph])
  useEngineSync(engine)
  useSimClock(engine, playing)

  const palette = getPalette(paper)
  const showMotion = !prefersReducedMotion()
  return (
    <g className="sim-layer" pointerEvents="none">
      <Meters engine={engine} palette={palette} />
      {showMotion && <Packets engine={engine} palette={palette} />}
      {showMotion && <Tags engine={engine} palette={palette} />}
    </g>
  )
}

// Lives in the recorded board, so a take captures the traffic; exports
// draw from the document and never include it.
export function SimLayer({
  page,
  paper,
  isVisible = ALL,
}: {
  page: Page
  paper: Paper
  isVisible?: (shape: Shape) => boolean
}) {
  const active = useSimStore((s) => s.active)
  if (!active) return null
  return (
    <SimRunner key={page.id} page={page} paper={paper} isVisible={isVisible} />
  )
}
