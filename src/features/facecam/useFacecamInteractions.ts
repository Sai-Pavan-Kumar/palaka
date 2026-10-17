import { useEffect, useRef, useState, type PointerEvent } from 'react'
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

function calcMaxTopRightGrowth(
  bubble: HTMLElement | null,
  startX: number,
  startY: number,
  startSize: number,
): number {
  const parent = bubble?.offsetParent as HTMLElement | null
  if (!parent) return MAX_FACECAM_SIZE
  const maxW = parent.clientWidth - 16
  const startBottom = startY + startSize
  const maxUp = Math.max(0, startBottom - 16)
  const maxRight = Math.max(0, maxW - startX)
  const maxFit = Math.min(maxUp, maxRight)
  return Math.min(MAX_FACECAM_SIZE, Math.max(MIN_FACECAM_SIZE, maxFit))
}

function computeNextTopRightResize(
  bubble: HTMLElement | null,
  clientX: number,
  clientY: number,
  start: {
    pointerX: number
    pointerY: number
    startSize: number
    startX: number
    startY: number
  },
): { nextSize: number; nextY: number } {
  const deltaX = clientX - start.pointerX
  const deltaY = start.pointerY - clientY
  const delta = Math.abs(deltaX) > Math.abs(deltaY) ? deltaX : deltaY
  const maxAllowed = calcMaxTopRightGrowth(
    bubble,
    start.startX,
    start.startY,
    start.startSize,
  )
  const nextSize = Math.max(
    MIN_FACECAM_SIZE,
    Math.min(maxAllowed, Math.round(start.startSize + delta)),
  )
  const nextY = Math.max(16, start.startY + start.startSize - nextSize)
  return { nextSize, nextY }
}

function initResizeStart(
  e: PointerEvent<HTMLDivElement>,
  customSize: number,
  pos: { x: number; y: number } | null,
  setPos: (pos: { x: number; y: number }) => void,
) {
  const bubble = e.currentTarget.closest(
    '.facecam-bubble',
  ) as HTMLElement | null
  const curX = pos ? pos.x : (bubble?.offsetLeft ?? 0)
  const curY = pos ? pos.y : (bubble?.offsetTop ?? 0)
  if (!pos && bubble) setPos({ x: curX, y: curY })
  return {
    pointerX: e.clientX,
    pointerY: e.clientY,
    startSize: customSize,
    startX: curX,
    startY: curY,
  }
}

export function useFacecamResize(
  customSize: number,
  setCustomSize: (size: number) => void,
  pos: { x: number; y: number } | null,
  setPos: (pos: { x: number; y: number }) => void,
) {
  const [isResizing, setIsResizing] = useState(false)
  const resizeStart = useRef({
    pointerX: 0,
    pointerY: 0,
    startSize: 0,
    startX: 0,
    startY: 0,
  })

  const onResizePointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return
    e.stopPropagation()
    resizeStart.current = initResizeStart(e, customSize, pos, setPos)
    setIsResizing(true)
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  const onResizePointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!isResizing) return
    e.stopPropagation()
    const bubble = e.currentTarget.closest(
      '.facecam-bubble',
    ) as HTMLElement | null
    const { nextSize, nextY } = computeNextTopRightResize(
      bubble,
      e.clientX,
      e.clientY,
      resizeStart.current,
    )
    setCustomSize(nextSize)
    setPos({ x: resizeStart.current.startX, y: nextY })
  }

  const onResizePointerUp = (e: PointerEvent<HTMLDivElement>) => {
    if (!isResizing) return
    e.stopPropagation()
    setIsResizing(false)
  }

  return { onResizePointerDown, onResizePointerMove, onResizePointerUp }
}

export function useFacecamBoundary(
  bubbleRef: React.RefObject<HTMLDivElement | null>,
  customSize: number,
  setCustomSize: (size: number) => void,
  pos: { x: number; y: number } | null,
  setPos: (pos: { x: number; y: number }) => void,
  aspect: string,
) {
  useEffect(() => {
    const bubble = bubbleRef.current
    const parent = bubble?.offsetParent as HTMLElement | null
    if (!parent) return
    const maxW = parent.clientWidth
    const maxH = parent.clientHeight
    if (customSize > maxW - 32) {
      setCustomSize(Math.max(MIN_FACECAM_SIZE, maxW - 32))
    }
    if (pos) {
      const maxX = Math.max(16, maxW - customSize - 16)
      const maxY = Math.max(16, maxH - customSize - 16)
      const nextX = Math.min(maxX, Math.max(16, pos.x))
      const nextY = Math.min(maxY, Math.max(16, pos.y))
      if (nextX !== pos.x || nextY !== pos.y) {
        setPos({ x: nextX, y: nextY })
      }
    }
  }, [aspect, customSize, pos, setCustomSize, setPos, bubbleRef])
}
