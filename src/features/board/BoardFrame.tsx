import type { ReactNode, Ref } from 'react'
import './board.css'

type BoardFrameProps = {
  ref?: Ref<HTMLDivElement>
  children: ReactNode
  isPresenting?: boolean
}

// The element Element Capture records. Anything rendered inside it ends up
// in the video, so only board content and on-video overlays belong here.
export function BoardFrame({
  ref,
  children,
  isPresenting = false,
}: BoardFrameProps) {
  return (
    <div
      ref={ref}
      className={`board ${isPresenting ? 'is-presenting' : ''}`}
      aria-label="Whiteboard"
    >
      {children}
    </div>
  )
}
