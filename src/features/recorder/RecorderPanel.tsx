import type { RefObject } from 'react'
import { isElementCaptureSupported } from './boardRecorder'
import { useBoardRecorder } from './useBoardRecorder'
import { RecordingResultCard } from './RecordingResultCard'
import { CaptureSettingsFields } from './CaptureSettingsFields'
import { useCaptureSettings } from './useCaptureSettings'
import './recorder.css'

type RecorderPanelProps = {
  boardRef: RefObject<HTMLElement | null>
}

export function RecorderPanel({ boardRef }: RecorderPanelProps) {
  const { options, fieldProps } = useCaptureSettings()
  const { status, error, results, start, stop } = useBoardRecorder(boardRef)

  if (!isElementCaptureSupported()) {
    return (
      <aside className="recorder recorder--blocked" role="alert">
        Element Capture is not available. Open this page in Chrome 132+ on
        desktop.
      </aside>
    )
  }

  const isRecording = status === 'recording'
  const isBusy = status === 'starting' || status === 'stopping'
  const recordLabel = isRecording
    ? 'Stop'
    : isBusy
      ? 'Please wait…'
      : 'Record board'

  return (
    <aside className="recorder" aria-label="Recording test panel">
      <p className="recorder__eyebrow">Capture spike</p>
      <CaptureSettingsFields {...fieldProps} disabled={isRecording || isBusy} />
      <button
        type="button"
        className={`recorder__record ${isRecording ? 'is-recording' : ''}`}
        disabled={isBusy || !options.mimeType}
        onClick={() => (isRecording ? stop() : start(options))}
      >
        {recordLabel}
      </button>
      {error && <p className="recorder__error">{error}</p>}
      <div className="recorder__results">
        {results.length === 0 && (
          <p className="recorder__empty">No test recordings yet.</p>
        )}
        {results.map((result) => (
          <RecordingResultCard key={result.id} result={result} />
        ))}
      </div>
    </aside>
  )
}
