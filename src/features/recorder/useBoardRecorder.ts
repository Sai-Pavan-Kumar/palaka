import { useCallback, useRef, useState, type RefObject } from 'react'
import {
  describeCaptureError,
  startBoardRecording,
  type BoardRecording,
  type RecordingOptions,
  type RecordingResult,
} from './boardRecorder'

export type RecorderStatus = 'idle' | 'starting' | 'recording' | 'stopping'

export function useBoardRecorder(boardRef: RefObject<HTMLElement | null>) {
  const [status, setStatus] = useState<RecorderStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  const [results, setResults] = useState<RecordingResult[]>([])
  const recordingRef = useRef<BoardRecording | null>(null)

  const stop = useCallback(async () => {
    const recording = recordingRef.current
    if (!recording) return
    recordingRef.current = null
    setStatus('stopping')
    const result = await recording.stop()
    setResults((previous) => [result, ...previous])
    setStatus('idle')
  }, [])

  const start = useCallback(
    async (options: RecordingOptions) => {
      const board = boardRef.current
      if (!board) return
      setError(null)
      setStatus('starting')
      try {
        recordingRef.current = await startBoardRecording(board, options, stop)
        setStatus('recording')
      } catch (captureError) {
        setError(describeCaptureError(captureError))
        setStatus('idle')
      }
    },
    [boardRef, stop],
  )

  return { status, error, results, start, stop }
}
