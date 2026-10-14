import { captureBoardTrack, CHUNK_INTERVAL_MS } from './boardRecorder'
import { fileExtensionFor, pickRecordingMimeType } from './codecs'
import type { TakeWriter } from './takeWriters'

export type QualityPreset = 'small' | 'balanced' | 'high'

// Placeholders bracketing Chrome's 2.5 Mbps default. Replace with the capture
// spike's numbers once text sharpness per bitrate has been measured.
export const QUALITY_BITRATES: Record<QualityPreset, number> = {
  small: 1_500_000,
  balanced: 2_500_000,
  high: 4_000_000,
}
const FRAME_RATE = 30
const AUDIO_BITS_PER_SECOND = 128_000

export type CaptureSession = {
  stream: MediaStream
  videoTrack: MediaStreamTrack
  mimeType: string
  extension: string
  release: () => void
}

export type FileRecorder = {
  pause: () => void
  resume: () => void
  stop: () => Promise<Blob>
}

export async function openCaptureSession(
  board: HTMLElement,
  withMic: boolean,
): Promise<CaptureSession> {
  const mimeType = pickRecordingMimeType()
  if (!mimeType) throw new Error('This browser cannot record video.')
  const display = await captureBoardTrack(board, FRAME_RATE)
  let mic: MediaStream | null = null
  try {
    mic = withMic
      ? await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true },
        })
      : null
  } catch (error) {
    display.getTracks().forEach((track) => track.stop())
    throw error
  }
  const [videoTrack] = display.getVideoTracks()
  return {
    stream: new MediaStream([videoTrack, ...(mic?.getAudioTracks() ?? [])]),
    videoTrack,
    mimeType,
    extension: fileExtensionFor(mimeType),
    release: () =>
      [display, mic].forEach((s) => s?.getTracks().forEach((t) => t.stop())),
  }
}

// With a folder open, chunks stream straight into the file on disk, so a
// 30-minute take never sits in memory and a crash keeps what was recorded.
export function startFileRecorder(
  session: CaptureSession,
  writer: TakeWriter,
  videoBitsPerSecond: number,
  onWriteError: (error: unknown) => void,
): FileRecorder {
  const recorder = new MediaRecorder(session.stream, {
    mimeType: session.mimeType,
    videoBitsPerSecond,
    audioBitsPerSecond: AUDIO_BITS_PER_SECOND,
  })
  let writes = Promise.resolve()
  let failure: unknown = null

  recorder.ondataavailable = (event) => {
    if (!event.data.size || failure) return
    writes = writes
      .then(() => writer.write(event.data))
      .catch((error: unknown) => {
        failure = error
        onWriteError(error)
      })
  }
  recorder.start(CHUNK_INTERVAL_MS)

  const finish = async (): Promise<Blob> => {
    await writes
    session.release()
    if (failure) {
      await writer.discard()
      throw failure
    }
    return writer.finish()
  }

  return {
    pause: () => recorder.state === 'recording' && recorder.pause(),
    resume: () => recorder.state === 'paused' && recorder.resume(),
    stop: () =>
      new Promise<Blob>((resolve, reject) => {
        const settle = () => finish().then(resolve, reject)
        // A track ended by Chrome's "Stop sharing" bar already stopped the recorder.
        if (recorder.state === 'inactive') return void settle()
        recorder.onstop = settle
        recorder.stop()
      }),
  }
}
