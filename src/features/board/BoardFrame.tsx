import type { DragEvent, ReactNode, Ref } from 'react'
import './board.css'

type BoardFrameProps = {
  ref?: Ref<HTMLDivElement>
  children: ReactNode
  isPresenting?: boolean
  onPointerDown?: () => void
  onDragOver?: (event: DragEvent<HTMLDivElement>) => void
  onDropCapture?: (event: DragEvent<HTMLDivElement>) => void
}

// The 16:9 element Element Capture records. Anything rendered inside it ends
// up in the video, so only board content and on-video overlays belong here.
export function BoardFrame({
  ref,
  children,
  isPresenting = false,
  onPointerDown,
  onDragOver,
  onDropCapture,
}: BoardFrameProps) {
  return (
    <div
      ref={ref}
      className={`board ${isPresenting ? 'is-presenting' : ''}`}
      aria-label="Whiteboard"
      onPointerDown={onPointerDown}
      onDragOver={onDragOver}
      onDropCapture={onDropCapture}
    >
      {children}
    </div>
  )
}
