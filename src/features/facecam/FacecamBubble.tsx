import { useEffect, useRef, type PointerEvent } from 'react'
import {
  Circle,
  CircleDashed,
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

function SparkleEffectButton({
  effect,
  cycleEffect,
}: {
  effect: FacecamEffect
  cycleEffect: () => void
}) {
  return (
    <button
      type="button"
      className={`facecam-btn ${effect !== 'none' ? 'is-active' : ''}`}
      title={effectTitle(effect)}
      onClick={cycleEffect}
    >
      <Sparkles size={12} />
    </button>
  )
}

const SHAPE_LABELS: Record<FacecamShape, string> = {
  circle: 'Circle',
  rounded: 'Squircle',
  feather: 'Feather',
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
        title={`Shape: ${SHAPE_LABELS[shape]} (Click to switch)`}
        onClick={cycleShape}
      >
        {shape === 'circle' && <Circle size={12} />}
        {shape === 'rounded' && <Square size={12} />}
        {shape === 'feather' && <CircleDashed size={12} />}
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
      <SparkleEffectButton
        effect={props.effect}
        cycleEffect={props.cycleEffect}
      />
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

function FacecamEffectsLayer({ effect }: { effect: FacecamEffect }) {
  if (effect !== 'studio-rim' && effect !== 'spinning-border') return null
  return (
    <div className="facecam-border-track">
      <div className="facecam-studio-rim" />
    </div>
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
      {effect === 'subscribe-badge' && (
        <FacecamSocialBadge
          platform={badgePlatform}
          bannerText={bannerText}
          onToggle={store.toggleBadgePlatform}
        />
      )}
      <FacecamEffectsLayer effect={effect} />
      <FacecamVideo videoRef={videoRef} mirrored={mirrored} />
      <FacecamResizeHandle {...resize} />
      <FacecamControls
        shape={shape}
        effect={effect}
        cycleShape={store.cycleShape}
        cycleSize={store.cycleSize}
        cycleEffect={store.cycleEffect}
        toggleMirrored={store.toggleMirrored}
        closeCamera={store.closeCamera}
      />
    </div>
  )
}
