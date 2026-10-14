import { useEffect, useRef, useState, type ReactNode } from 'react'
import './ui.css'

type PopoverProps = {
  trigger: (props: { isOpen: boolean; toggle: () => void }) => ReactNode
  children: (close: () => void) => ReactNode
  align?: 'start' | 'center' | 'end'
  side?: 'below' | 'above'
}

// Popovers render next to their trigger, outside the board element, so open
// menus can never leak into a recording.
export function Popover({
  trigger,
  children,
  align = 'center',
  side = 'below',
}: PopoverProps) {
  const [isOpen, setIsOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen) return
    const closeOnOutside = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setIsOpen(false)
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false)
    }
    document.addEventListener('pointerdown', closeOnOutside)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('pointerdown', closeOnOutside)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [isOpen])

  const close = () => setIsOpen(false)
  return (
    <div className="popover" ref={rootRef}>
      {trigger({ isOpen, toggle: () => setIsOpen((open) => !open) })}
      {isOpen && (
        <div
          className={`popover__panel align-${align} side-${side}`}
          role="menu"
        >
          {children(close)}
        </div>
      )}
    </div>
  )
}
