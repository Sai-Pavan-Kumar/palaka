import { useEffect, useState } from 'react'
import { ChevronDown, Mic, MicOff, Pause, Play, Square } from 'lucide-react'
import { IconButton } from '../../shared/ui/IconButton'
import { Popover } from '../../shared/ui/Popover'
import { isElementCaptureSupported } from './boardRecorder'
import { getElapsedMs, useRecorderStore } from './recorderStore'
import {
  startRecording,
  stopRecording,
  togglePause,
} from './recordingController'
import type { QualityPreset } from './sessionRecorder'
import './recordControls.css'

const QUALITY_LABELS: Record<QualityPreset, string> = {
  small: 'Small file',
  balanced: 'Balanced',
  high: 'High quality',
}
const TIMER_REFRESH_MS = 250

function formatElapsed(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000)
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, '0')
  return `${minutes}:${String(totalSeconds % 60).padStart(2, '0')}`
}

function useElapsedLabel(): string {
  const bankedMs = useRecorderStore((s) => s.bankedMs)
  const runningSince = useRecorderStore((s) => s.runningSince)
  const [, forceTick] = useState(0)
  useEffect(() => {
    if (runningSince === null) return
    const timer = window.setInterval(
      () => forceTick((t) => t + 1),
      TIMER_REFRESH_MS,
    )
    return () => window.clearInterval(timer)
  }, [runningSince])
  return formatElapsed(getElapsedMs({ bankedMs, runningSince }))
}

function RecordSettings() {
  const { quality, isMicOn, setQuality, toggleMic } = useRecorderStore()
  return (
    <Popover
      align="end"
      trigger={({ toggle }) => (
        <IconButton
          icon={ChevronDown}
          label="Recording settings"
          onClick={toggle}
        />
      )}
    >
      {() => (
        <>
          <p className="menu-label">Quality</p>
          {(Object.keys(QUALITY_LABELS) as QualityPreset[]).map((preset) => (
            <button
              key={preset}
              type="button"
              className={`menu-item ${quality === preset ? 'is-active' : ''}`}
              onClick={() => setQuality(preset)}
            >
              {QUALITY_LABELS[preset]}
            </button>
          ))}
          <p className="menu-label">Voice</p>
          <button type="button" className="menu-item" onClick={toggleMic}>
            {isMicOn ? (
              <Mic size={18} aria-hidden />
            ) : (
              <MicOff size={18} aria-hidden />
            )}
            {isMicOn ? 'Microphone on' : 'Microphone off'}
          </button>
        </>
      )}
    </Popover>
  )
}

function LiveControls() {
  const status = useRecorderStore((s) => s.status)
  const elapsed = useElapsedLabel()
  return (
    <>
      <span
        className={`record-timer ${status === 'paused' ? 'is-paused' : ''}`}
      >
        <span className="record-timer__dot" aria-hidden />
        {elapsed}
      </span>
      <IconButton
        icon={status === 'paused' ? Play : Pause}
        label={status === 'paused' ? 'Resume' : 'Pause'}
        onClick={togglePause}
      />
      <IconButton
        icon={Square}
        label="Stop and save"
        tone="danger"
        onClick={() => void stopRecording()}
      />
    </>
  )
}

export function RecordControls() {
  const status = useRecorderStore((s) => s.status)
  if (status === 'recording' || status === 'paused') return <LiveControls />
  if (status !== 'idle') {
    return (
      <button
        type="button"
        className="record-button"
        disabled={status !== 'countdown'}
        onClick={() => void stopRecording()}
      >
        {status === 'saving'
          ? 'Saving…'
          : status === 'countdown'
            ? 'Cancel'
            : 'Starting…'}
      </button>
    )
  }
  const supported = isElementCaptureSupported()
  return (
    <>
      <button
        type="button"
        className="record-button"
        disabled={!supported}
        title={
          supported ? 'Record only the board' : 'Needs Chrome 132+ on desktop'
        }
        onClick={() => void startRecording()}
      >
        <span className="record-button__dot" aria-hidden />
        Rec
      </button>
      <RecordSettings />
    </>
  )
}
