import { useRef, useState, type PointerEvent } from 'react'
import { MAX_FACECAM_SIZE, MIN_FACECAM_SIZE } from './facecamStore'

function clampDragPos(
  origX: number,
  origY: number,
  dx: number,
  dy: number,
  target: HTMLElement,
): { x: number; y: number } {
  const parent = target.offsetParent as HTMLElement | null
  const maxX = parent
    ? Math.max(16, parent.clientWidth - target.offsetWidth - 16)
    : 2000
  const maxY = parent
    ? Math.max(16, parent.clientHeight - target.offsetHeight - 16)
    : 2000
  return {
    x: Math.min(maxX, Math.max(16, origX + dx)),
    y: Math.min(maxY, Math.max(16, origY + dy)),
  }
}

export function useFacecamDrag(
  pos: { x: number; y: number } | null,
  setPos: (pos: { x: number; y: number }) => void,
) {
  const [isDragging, setIsDragging] = useState(false)
  const dragStart = useRef({ pointerX: 0, pointerY: 0, origX: 0, origY: 0 })

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return
    e.stopPropagation()
    const target = e.currentTarget
    dragStart.current = {
      pointerX: e.clientX,
      pointerY: e.clientY,
      origX: pos ? pos.x : target.offsetLeft,
      origY: pos ? pos.y : target.offsetTop,
    }
    setIsDragging(true)
    target.setPointerCapture(e.pointerId)
  }

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return
    e.stopPropagation()
    const p = clampDragPos(
      dragStart.current.origX,
      dragStart.current.origY,
      e.clientX - dragStart.current.pointerX,
      e.clientY - dragStart.current.pointerY,
      e.currentTarget,
    )
    setPos(p)
  }

  const onPointerUp = (e: PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return
    e.stopPropagation()
    setIsDragging(false)
  }

  return { onPointerDown, onPointerMove, onPointerUp }
}

function calcMaxAllowed(
  bubble: HTMLElement | null,
  currX: number,
  currY: number,
): number {
  const parent = bubble?.offsetParent as HTMLElement | null
  if (!parent) return MAX_FACECAM_SIZE
  const availW = parent.clientWidth - currX - 16
  const availH = parent.clientHeight - currY - 16
  return Math.min(MAX_FACECAM_SIZE, Math.max(MIN_FACECAM_SIZE, availW, availH))
}

export function useFacecamResize(
  customSize: number,
  setCustomSize: (size: number) => void,
  pos: { x: number; y: number } | null,
  setPos: (pos: { x: number; y: number }) => void,
) {
  const [isResizing, setIsResizing] = useState(false)
  const resizeStart = useRef({ pointerX: 0, startSize: 0 })

  const onResizePointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return
    e.stopPropagation()
    const bubble = e.currentTarget.closest(
      '.facecam-bubble',
    ) as HTMLElement | null
    if (!pos && bubble) {
      setPos({ x: bubble.offsetLeft, y: bubble.offsetTop })
    }
    resizeStart.current = { pointerX: e.clientX, startSize: customSize }
    setIsResizing(true)
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  const onResizePointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!isResizing) return
    e.stopPropagation()
    const delta = e.clientX - resizeStart.current.pointerX
    const bubble = e.currentTarget.closest(
      '.facecam-bubble',
    ) as HTMLElement | null
    const currX = pos?.x ?? bubble?.offsetLeft ?? 0
    const currY = pos?.y ?? bubble?.offsetTop ?? 0
    const maxAllowed = calcMaxAllowed(bubble, currX, currY)
    const next = Math.max(
      MIN_FACECAM_SIZE,
      Math.min(maxAllowed, resizeStart.current.startSize + delta),
    )
    setCustomSize(next)
  }

  const onResizePointerUp = (e: PointerEvent<HTMLDivElement>) => {
    if (!isResizing) return
    e.stopPropagation()
    setIsResizing(false)
  }

  return { onResizePointerDown, onResizePointerMove, onResizePointerUp }
}
