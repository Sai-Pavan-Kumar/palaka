import { useEffect, useRef, type PointerEvent } from 'react'
import {
  Bell,
  Circle,
  FlipHorizontal,
  Maximize2,
  Sparkles,
  Square,
  X,
} from 'lucide-react'
import {
  type FacecamEffect,
  type FacecamShape,
  useFacecamStore,
} from './facecamStore'
import { useFacecamDrag, useFacecamResize } from './useFacecamInteractions'
import './facecam.css'

function effectTitle(effect: FacecamEffect): string {
  switch (effect) {
    case 'spinning-border':
      return 'Effect: Spinning Neon Border (Click to switch)'
    case 'pulse':
      return 'Effect: Pulse Glow (Click to switch)'
    case 'subscribe-badge':
      return 'Effect: Subscribe Banner (Click to switch)'
    default:
      return 'Effect: None (Click to enable effects)'
  }
}

function ShapeSizeButtons({
  shape,
  cycleShape,
  cycleSize,
}: {
  shape: FacecamShape
  cycleShape: () => void
  cycleSize: () => void
}) {
  return (
    <>
      <button
        type="button"
        className="facecam-btn"
        title="Toggle shape (Circle/Square)"
        onClick={cycleShape}
      >
        {shape === 'circle' ? <Square size={13} /> : <Circle size={13} />}
      </button>
      <button
        type="button"
        className="facecam-btn"
        title="Cycle preset size (S/M/L)"
        onClick={cycleSize}
      >
        <Maximize2 size={13} />
      </button>
    </>
  )
}

function ActionButtons({
  effect,
  cycleEffect,
  toggleMirrored,
  closeCamera,
}: {
  effect: FacecamEffect
  cycleEffect: () => void
  toggleMirrored: () => void
  closeCamera: () => void
}) {
  return (
    <>
      <button
        type="button"
        className={`facecam-btn ${effect !== 'none' ? 'is-active' : ''}`}
        title={effectTitle(effect)}
        onClick={cycleEffect}
      >
        <Sparkles size={13} />
      </button>
      <button
        type="button"
        className="facecam-btn"
        title="Mirror camera"
        onClick={toggleMirrored}
      >
        <FlipHorizontal size={13} />
      </button>
      <button
        type="button"
        className="facecam-btn"
        title="Close camera"
        onClick={closeCamera}
      >
        <X size={13} />
      </button>
    </>
  )
}

type FacecamControlsProps = {
  shape: FacecamShape
  effect: FacecamEffect
  cycleShape: () => void
  cycleSize: () => void
  cycleEffect: () => void
  toggleMirrored: () => void
  closeCamera: () => void
}

function FacecamControls(props: FacecamControlsProps) {
  return (
    <div
      className="facecam-controls"
      onPointerDown={(e) => e.stopPropagation()}
    >
      <ShapeSizeButtons
        shape={props.shape}
        cycleShape={props.cycleShape}
        cycleSize={props.cycleSize}
      />
      <ActionButtons
        effect={props.effect}
        cycleEffect={props.cycleEffect}
        toggleMirrored={props.toggleMirrored}
        closeCamera={props.closeCamera}
      />
    </div>
  )
}

function bubbleStyle(
  sizePx: number,
  pos: { x: number; y: number } | null,
): React.CSSProperties {
  return {
    width: `${sizePx}px`,
    height: `${sizePx}px`,
    ...(pos
      ? { left: `${pos.x}px`, top: `${pos.y}px` }
      : { right: '36px', bottom: '36px' }),
  }
}

function FacecamEffectsLayer({
  effect,
  bannerText,
}: {
  effect: FacecamEffect
  bannerText: string
}) {
  return (
    <>
      {effect === 'subscribe-badge' && (
        <div className="facecam-badge">
          <Bell size={11} className="facecam-badge-icon" />
          <span>{bannerText}</span>
        </div>
      )}
      {effect === 'spinning-border' && (
        <div className="facecam-border-track">
          <div className="facecam-spin-border" />
        </div>
      )}
    </>
  )
}

function FacecamVideo({
  videoRef,
  mirrored,
}: {
  videoRef: React.RefObject<HTMLVideoElement | null>
  mirrored: boolean
}) {
  return (
    <div className="facecam-video-wrap">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="facecam-video"
        style={{ transform: mirrored ? 'scaleX(-1)' : 'none' }}
      />
    </div>
  )
}

function FacecamResizeHandle({
  onResizePointerDown,
  onResizePointerMove,
  onResizePointerUp,
}: {
  onResizePointerDown: (e: PointerEvent<HTMLDivElement>) => void
  onResizePointerMove: (e: PointerEvent<HTMLDivElement>) => void
  onResizePointerUp: (e: PointerEvent<HTMLDivElement>) => void
}) {
  return (
    <div
      className="facecam-resize-handle"
      title="Drag corner to resize"
      onPointerDown={onResizePointerDown}
      onPointerMove={onResizePointerMove}
      onPointerUp={onResizePointerUp}
    />
  )
}

export function FacecamBubble() {
  const store = useFacecamStore()
  const {
    isEnabled,
    stream,
    pos,
    shape,
    customSize,
    effect,
    bannerText,
    mirrored,
  } = store
  const videoRef = useRef<HTMLVideoElement>(null)
  const drag = useFacecamDrag(pos, store.setPos)
  const resize = useFacecamResize(
    customSize,
    store.setCustomSize,
    pos,
    store.setPos,
  )

  useEffect(() => {
    if (videoRef.current && stream) videoRef.current.srcObject = stream
  }, [stream])

  if (!isEnabled || !stream) return null
  const effectClass = effect !== 'none' ? `has-${effect}` : ''

  return (
    <div
      className={`facecam-bubble is-${shape} ${effectClass}`}
      style={bubbleStyle(customSize, pos)}
      {...drag}
    >
      <FacecamEffectsLayer effect={effect} bannerText={bannerText} />
      <FacecamVideo videoRef={videoRef} mirrored={mirrored} />
      <FacecamControls
        shape={shape}
        effect={effect}
        cycleShape={store.cycleShape}
        cycleSize={store.cycleSize}
        cycleEffect={store.cycleEffect}
        toggleMirrored={store.toggleMirrored}
        closeCamera={store.closeCamera}
      />
      <FacecamResizeHandle {...resize} />
    </div>
  )
}
