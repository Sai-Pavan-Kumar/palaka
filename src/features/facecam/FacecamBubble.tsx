import { useEffect, useRef, type PointerEvent } from 'react'
import {
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
import { useEngineStore } from '../engine/engineStore'
import {
  useFacecamBoundary,
  useFacecamDrag,
  useFacecamResize,
} from './useFacecamInteractions'
import { FacecamSocialBadge } from './FacecamSocialBadge'
import './facecam.css'

function effectTitle(effect: FacecamEffect): string {
  switch (effect) {
    case 'studio-rim':
    case 'spinning-border':
      return 'Effect: Studio Rim Light (Click to switch)'
    case 'pulse':
      return 'Effect: Breathing Aura (Click to switch)'
    case 'subscribe-badge':
      return 'Effect: Social Badge (Click to switch)'
    default:
      return 'Effect: None (Click to enable effects)'
  }
}

function TopLeftControls({
  effect,
  cycleEffect,
}: {
  effect: FacecamEffect
  cycleEffect: () => void
}) {
  return (
    <div
      className="facecam-corner-left"
      onPointerDown={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        className={`facecam-btn ${effect !== 'none' ? 'is-active' : ''}`}
        title={effectTitle(effect)}
        onClick={cycleEffect}
      >
        <Sparkles size={12} />
      </button>
    </div>
  )
}

type ShapeSizeButtonsProps = {
  shape: FacecamShape
  cycleShape: () => void
  cycleSize: () => void
}

function ShapeSizeButtons({
  shape,
  cycleShape,
  cycleSize,
}: ShapeSizeButtonsProps) {
  return (
    <>
      <button
        type="button"
        className="facecam-btn"
        title="Toggle shape (Circle/Square)"
        onClick={cycleShape}
      >
        {shape === 'circle' ? <Square size={12} /> : <Circle size={12} />}
      </button>
      <button
        type="button"
        className="facecam-btn"
        title="Cycle preset size (S/M/L)"
        onClick={cycleSize}
      >
        <Maximize2 size={12} />
      </button>
    </>
  )
}

function CameraActionButtons({
  toggleMirrored,
  closeCamera,
}: {
  toggleMirrored: () => void
  closeCamera: () => void
}) {
  return (
    <>
      <button
        type="button"
        className="facecam-btn"
        title="Mirror camera"
        onClick={toggleMirrored}
      >
        <FlipHorizontal size={12} />
      </button>
      <button
        type="button"
        className="facecam-btn facecam-btn--close"
        title="Close camera"
        onClick={closeCamera}
      >
        <X size={12} />
      </button>
    </>
  )
}

type TopRightControlsProps = {
  shape: FacecamShape
  cycleShape: () => void
  cycleSize: () => void
  toggleMirrored: () => void
  closeCamera: () => void
}

function TopRightControls(props: TopRightControlsProps) {
  return (
    <div
      className="facecam-corner-right"
      onPointerDown={(e) => e.stopPropagation()}
    >
      <ShapeSizeButtons
        shape={props.shape}
        cycleShape={props.cycleShape}
        cycleSize={props.cycleSize}
      />
      <CameraActionButtons
        toggleMirrored={props.toggleMirrored}
        closeCamera={props.closeCamera}
      />
    </div>
  )
}

function bubbleStyle(
  sizePx: number,
  pos: { x: number; y: number } | null,
  isPortrait: boolean,
): React.CSSProperties {
  const bottomOffset = isPortrait ? '84px' : '36px'
  const rightOffset = isPortrait ? '16px' : '36px'
  return {
    width: `${sizePx}px`,
    height: `${sizePx}px`,
    ...(pos
      ? { left: `${pos.x}px`, top: `${pos.y}px` }
      : { right: rightOffset, bottom: bottomOffset }),
  }
}

function FacecamEffectsLayer({
  effect,
  platform,
  bannerText,
  onTogglePlatform,
}: {
  effect: FacecamEffect
  platform: 'youtube' | 'instagram'
  bannerText: string
  onTogglePlatform: () => void
}) {
  return (
    <>
      {effect === 'subscribe-badge' && (
        <FacecamSocialBadge
          platform={platform}
          bannerText={bannerText}
          onToggle={onTogglePlatform}
        />
      )}
      {(effect === 'studio-rim' || effect === 'spinning-border') && (
        <div className="facecam-border-track">
          <div className="facecam-studio-rim" />
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

function useFacecamSetup() {
  const store = useFacecamStore()
  const aspect = useEngineStore((s) => s.doc.aspect)
  const isPortrait = aspect === '9:16'
  const bubbleRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const drag = useFacecamDrag(store.pos, store.setPos)
  const resize = useFacecamResize(
    store.customSize,
    store.setCustomSize,
    store.pos,
    store.setPos,
  )

  useEffect(() => {
    if (videoRef.current && store.stream) {
      videoRef.current.srcObject = store.stream
    }
  }, [store.stream])

  useFacecamBoundary(
    bubbleRef,
    store.customSize,
    store.setCustomSize,
    store.pos,
    store.setPos,
    aspect,
  )

  return { store, isPortrait, bubbleRef, videoRef, drag, resize }
}

export function FacecamBubble() {
  const { store, isPortrait, bubbleRef, videoRef, drag, resize } =
    useFacecamSetup()
  const {
    isEnabled,
    stream,
    pos,
    shape,
    customSize,
    effect,
    bannerText,
    badgePlatform,
    mirrored,
  } = store

  if (!isEnabled || !stream) return null
  const effectClass = effect !== 'none' ? `has-${effect}` : ''

  return (
    <div
      ref={bubbleRef}
      className={`facecam-bubble is-${shape} ${effectClass}`}
      style={bubbleStyle(customSize, pos, isPortrait)}
      {...drag}
    >
      <FacecamEffectsLayer
        effect={effect}
        platform={badgePlatform}
        bannerText={bannerText}
        onTogglePlatform={store.toggleBadgePlatform}
      />
      <FacecamVideo videoRef={videoRef} mirrored={mirrored} />
      <TopLeftControls
        effect={effect}
        cycleEffect={store.cycleEffect}
      />
      <TopRightControls
        shape={shape}
        cycleShape={store.cycleShape}
        cycleSize={store.cycleSize}
        toggleMirrored={store.toggleMirrored}
        closeCamera={store.closeCamera}
      />
      <FacecamResizeHandle {...resize} />
    </div>
  )
}
