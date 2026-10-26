import { useCallback, useEffect, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'

type Offset = { x: number; y: number }

const STORAGE_KEY = 'palaka.simBarOffset'
// Part of the bar that must stay on screen, so it can always be grabbed.
const KEEP_VISIBLE_PX = 48

function readOffset(): Offset {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null')
    if (typeof saved?.x === 'number' && typeof saved?.y === 'number') {
      return saved
    }
  } catch {
    // Private window or blocked storage: start from the default spot.
  }
  return { x: 0, y: 0 }
}

function saveOffset(offset: Offset): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(offset))
  } catch {
    // Not remembering the spot is fine; the drag itself still works.
  }
}

// The teacher parks the bar wherever it does not cover the diagram. The
// spot is a per-browser convenience, so it lives in localStorage.
export function useDraggableBar() {
  const [offset, setOffset] = useState<Offset>(readOffset)
  const drag = useRef<{ start: Offset; from: Offset; last: Offset } | null>(
    null,
  )

  const clamp = useCallback((next: Offset): Offset => {
    const maxX = window.innerWidth / 2 - KEEP_VISIBLE_PX
    const maxY = window.innerHeight - KEEP_VISIBLE_PX * 2
    return {
      x: Math.max(-maxX, Math.min(maxX, next.x)),
      y: Math.max(-maxY, Math.min(KEEP_VISIBLE_PX, next.y)),
    }
  }, [])

  useEffect(() => {
    const keepInView = () => setOffset((current) => clamp(current))
    window.addEventListener('resize', keepInView)
    return () => window.removeEventListener('resize', keepInView)
  }, [clamp])

  const onPointerDown = (event: ReactPointerEvent<HTMLElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId)
    drag.current = {
      start: { x: event.clientX, y: event.clientY },
      from: offset,
      last: offset,
    }
  }
  const onPointerMove = (event: ReactPointerEvent<HTMLElement>) => {
    if (!drag.current) return
    const { start, from } = drag.current
    const next = clamp({
      x: from.x + event.clientX - start.x,
      y: from.y + event.clientY - start.y,
    })
    drag.current.last = next
    setOffset(next)
  }
  const onPointerUp = () => {
    if (!drag.current) return
    saveOffset(drag.current.last)
    drag.current = null
  }

  return {
    style: { translate: `${offset.x}px ${offset.y}px` },
    handleProps: { onPointerDown, onPointerMove, onPointerUp },
  }
}
