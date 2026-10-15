import { useEffect, useRef, useState, type PointerEvent } from 'react'
import { Circle, FlipHorizontal, Maximize2, Square, X } from 'lucide-react'
import { FACECAM_SIZES, useFacecamStore } from './facecamStore'
import './facecam.css'

function useFacecamDrag(
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
    const dx = e.clientX - dragStart.current.pointerX
    const dy = e.clientY - dragStart.current.pointerY
    const target = e.currentTarget
    const parent = target.offsetParent as HTMLElement | null
    const maxX = parent
      ? Math.max(16, parent.clientWidth - target.offsetWidth - 16)
      : 2000
    const maxY = parent
      ? Math.max(16, parent.clientHeight - target.offsetHeight - 16)
      : 2000
    setPos({
      x: Math.min(maxX, Math.max(16, dragStart.current.origX + dx)),
      y: Math.min(maxY, Math.max(16, dragStart.current.origY + dy)),
    })
  }

  const onPointerUp = (e: PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return
    e.stopPropagation()
    setIsDragging(false)
  }

  return { onPointerDown, onPointerMove, onPointerUp }
}

function FacecamControls({
  shape,
  cycleShape,
  cycleSize,
  toggleMirrored,
  closeCamera,
}: {
  shape: import('./facecamStore').FacecamShape
  cycleShape: () => void
  cycleSize: () => void
  toggleMirrored: () => void
  closeCamera: () => void
}) {
  return (
    <div
      className="facecam-controls"
      onPointerDown={(e) => e.stopPropagation()}
    >
      <button
        className="facecam-btn"
        title="Toggle shape (Circle/Square)"
        onClick={cycleShape}
      >
        {shape === 'circle' ? <Square size={13} /> : <Circle size={13} />}
      </button>
      <button
        className="facecam-btn"
        title="Cycle size (S/M/L)"
        onClick={cycleSize}
      >
        <Maximize2 size={13} />
      </button>
      <button
        className="facecam-btn"
        title="Mirror camera"
        onClick={toggleMirrored}
      >
        <FlipHorizontal size={13} />
      </button>
      <button
        className="facecam-btn"
        title="Close camera"
        onClick={closeCamera}
      >
        <X size={13} />
      </button>
    </div>
  )
}

function bubbleStyle(
  size: import('./facecamStore').FacecamSize,
  pos: { x: number; y: number } | null,
): React.CSSProperties {
  const px = FACECAM_SIZES[size]
  return {
    width: `${px}px`,
    height: `${px}px`,
    ...(pos
      ? { left: `${pos.x}px`, top: `${pos.y}px` }
      : { right: '36px', bottom: '36px' }),
  }
}

export function FacecamBubble() {
  const isEnabled = useFacecamStore((s) => s.isEnabled)
  const stream = useFacecamStore((s) => s.stream)
  const pos = useFacecamStore((s) => s.pos)
  const shape = useFacecamStore((s) => s.shape)
  const size = useFacecamStore((s) => s.size)
  const mirrored = useFacecamStore((s) => s.mirrored)
  const setPos = useFacecamStore((s) => s.setPos)
  const cycleShape = useFacecamStore((s) => s.cycleShape)
  const cycleSize = useFacecamStore((s) => s.cycleSize)
  const toggleMirrored = useFacecamStore((s) => s.toggleMirrored)
  const closeCamera = useFacecamStore((s) => s.closeCamera)

  const videoRef = useRef<HTMLVideoElement>(null)
  const dragHandlers = useFacecamDrag(pos, setPos)

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream
    }
  }, [stream])

  if (!isEnabled || !stream) return null

  return (
    <div
      className={`facecam-bubble is-${shape}`}
      style={bubbleStyle(size, pos)}
      {...dragHandlers}
    >
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="facecam-video"
        style={{ transform: mirrored ? 'scaleX(-1)' : 'none' }}
      />
      <FacecamControls
        shape={shape}
        cycleShape={cycleShape}
        cycleSize={cycleSize}
        toggleMirrored={toggleMirrored}
        closeCamera={closeCamera}
      />
    </div>
  )
}
