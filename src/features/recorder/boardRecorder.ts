export type RecordingOptions = {
  mimeType: string
  videoBitsPerSecond: number
  frameRate: number
}

export type RecordingResult = {
  id: string
  blob: Blob
  // Lives as long as the blob it points to; the page holds both anyway.
  previewUrl: string
  mimeType: string
  durationMs: number
  videoBitsPerSecond: number
  frameRate: number
  trackSettings: MediaTrackSettings
}

export type BoardRecording = {
  stop: () => Promise<RecordingResult>
}

// MediaRecorder hands data over in slices; one second keeps memory flat on long
// takes without flooding the main thread with tiny blobs.
export const CHUNK_INTERVAL_MS = 1000

export function isElementCaptureSupported(): boolean {
  return 'RestrictionTarget' in self && 'fromElement' in RestrictionTarget
}

export async function captureBoardTrack(
  board: HTMLElement,
  frameRate: number,
): Promise<MediaStream> {
  const stream = await navigator.mediaDevices.getDisplayMedia({
    video: { frameRate },
    audio: false,
    preferCurrentTab: true,
  })
  const [videoTrack] = stream.getVideoTracks()
  try {
    const target = await RestrictionTarget.fromElement(board)
    await videoTrack.restrictTo(target)
    return stream
  } catch (error) {
    // Without the restriction we would record the toolbars too, so never fall
    // through to a full-tab recording silently.
    stream.getTracks().forEach((track) => track.stop())
    throw error
  }
}

export async function startBoardRecording(
  board: HTMLElement,
  options: RecordingOptions,
  onEndedByBrowser: () => void,
): Promise<BoardRecording> {
  const stream = await captureBoardTrack(board, options.frameRate)
  const [videoTrack] = stream.getVideoTracks()
  const recorder = new MediaRecorder(stream, {
    mimeType: options.mimeType,
    videoBitsPerSecond: options.videoBitsPerSecond,
  })
  const chunks: Blob[] = []
  const startedAt = performance.now()

  recorder.ondataavailable = (event) => {
    if (event.data.size > 0) chunks.push(event.data)
  }
  // Chrome's own "Stop sharing" bar ends the track behind our back.
  videoTrack.onended = onEndedByBrowser
  recorder.start(CHUNK_INTERVAL_MS)

  const trackSettings = videoTrack.getSettings()
  const finish = (): RecordingResult => {
    stream.getTracks().forEach((track) => track.stop())
    const blob = new Blob(chunks, { type: options.mimeType })
    return {
      id: crypto.randomUUID(),
      blob,
      previewUrl: URL.createObjectURL(blob),
      mimeType: options.mimeType,
      durationMs: performance.now() - startedAt,
      videoBitsPerSecond: options.videoBitsPerSecond,
      frameRate: options.frameRate,
      trackSettings,
    }
  }

  const stop = () =>
    new Promise<RecordingResult>((resolve) => {
      // An ended track stops the recorder on its own, and its stop event has
      // already fired, so waiting for it again would hang forever.
      if (recorder.state === 'inactive') {
        resolve(finish())
        return
      }
      recorder.onstop = () => resolve(finish())
      recorder.stop()
    })

  return { stop }
}

export function describeCaptureError(error: unknown): string {
  if (error instanceof DOMException && error.name === 'NotAllowedError') {
    return 'Screen share was cancelled or blocked. Pick "This tab" to record.'
  }
  if (error instanceof Error) return error.message
  return 'Recording failed for an unknown reason.'
}
