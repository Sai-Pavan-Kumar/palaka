import {
  useRef,
  type MouseEvent,
  type PointerEvent,
  type RefObject,
} from 'react'
import { useSessionStore } from '../sessionStore'
import { finishTextEditing } from '../textEditing'
import { TOOL_HANDLERS } from '../tools/toolHandlers'
import type { BoardPointer, ToolGesture } from '../tools/toolTypes'

type ActiveGesture = { pointerId: number; gesture: ToolGesture }

function toBoardPointer(
  sample: globalThis.PointerEvent,
  rect: DOMRect,
  slideWidth: number,
  { shiftKey, altKey }: { shiftKey: boolean; altKey: boolean },
): BoardPointer {
  const unitsPerPixel = slideWidth / rect.width
  return {
    x: (sample.clientX - rect.left) * unitsPerPixel,
    y: (sample.clientY - rect.top) * unitsPerPixel,
    pressure: sample.pressure,
    isPen: sample.pointerType === 'pen',
    shiftKey,
    altKey,
    unitsPerPixel,
  }
}

// The browser's mouse-down step would move focus to the page and blur a
// text box the same press just opened, so it is cancelled. That also means
// a toolbar button clicked earlier would keep focus, and Space (next step
// while presenting) would "click" it: Present, Pause or Stop recording.
// So the press drops that focus itself; the text editor focuses itself.
function onMouseDown(event: MouseEvent<HTMLDivElement>) {
  if (event.target instanceof HTMLTextAreaElement) return
  event.preventDefault()
  // Only focus outside the stage (toolbar buttons). The text box this same
  // press just opened lives inside it and must keep its focus.
  const focused = document.activeElement
  const isOutside = !event.currentTarget.contains(focused)
  if (focused instanceof HTMLElement && focused !== document.body && isOutside)
    focused.blur()
}

function canStartGesture(event: PointerEvent<HTMLDivElement>): boolean {
  // Clicks inside the text editor belong to the textarea (caret, select).
  if (event.target instanceof HTMLTextAreaElement) return false
  // A click away from text being edited only finishes the edit, like every
  // editor: it must not also drop a new box or start a drag.
  if (useSessionStore.getState().editingTextId) {
    finishTextEditing()
    return false
  }
  return true
}

// Turns raw pointer events on the stage into tool gestures in board units.
// One gesture at a time: a palm or second finger is ignored, not drawn.
export function useBoardPointer(
  stageRef: RefObject<HTMLDivElement | null>,
  slideWidth: number,
  // Called on every press, before any tool runs (hides panels, closes drawers).
  onPress?: () => void,
) {
  const activeRef = useRef<ActiveGesture | null>(null)

  const convert = (
    event: PointerEvent<HTMLDivElement>,
    samples: globalThis.PointerEvent[],
  ) => {
    const rect = stageRef.current!.getBoundingClientRect()
    return samples.map((sample) =>
      toBoardPointer(sample, rect, slideWidth, event),
    )
  }

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    onPress?.()
    if (activeRef.current || event.button !== 0) return
    if (!canStartGesture(event)) return
    event.currentTarget.setPointerCapture(event.pointerId)
    const [pointer] = convert(event, [event.nativeEvent])
    const handler = TOOL_HANDLERS[useSessionStore.getState().tool]
    activeRef.current = {
      pointerId: event.pointerId,
      gesture: handler.start(pointer),
    }
  }

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const active = activeRef.current
    if (!active || active.pointerId !== event.pointerId) return
    const coalesced = event.nativeEvent.getCoalescedEvents?.() ?? []
    const samples = coalesced.length > 0 ? coalesced : [event.nativeEvent]
    active.gesture.move(convert(event, samples))
  }

  const finish = (event: PointerEvent<HTMLDivElement>) => {
    const active = activeRef.current
    if (!active || active.pointerId !== event.pointerId) return
    activeRef.current = null
    active.gesture.end()
  }

  return {
    onPointerDown,
    onMouseDown,
    onPointerMove,
    onPointerUp: finish,
    onPointerCancel: finish,
    onLostPointerCapture: finish,
  }
}
