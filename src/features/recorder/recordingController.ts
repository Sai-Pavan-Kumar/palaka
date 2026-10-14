import { useBoardStore } from '../board/boardStore'
import { setPresenting } from '../reveal/revealModel'
import { useUiStore } from '../shell/uiStore'
import { describeCaptureError } from './boardRecorder'
import { useRecorderStore } from './recorderStore'
import {
  openCaptureSession,
  QUALITY_BITRATES,
  startFileRecorder,
  type CaptureSession,
  type FileRecorder,
} from './sessionRecorder'
import { openTakeWriter, type TakeWriter } from './takeWriters'

const COUNTDOWN_FROM = 3
const COUNTDOWN_TICK_MS = 1000

type ActiveTake = {
  session: CaptureSession
  writer: TakeWriter
  recorder: FileRecorder | null
}

let activeTake: ActiveTake | null = null

const warnBeforeLeaving = (event: BeforeUnloadEvent) => event.preventDefault()

async function runCountdown(): Promise<boolean> {
  const store = useRecorderStore.getState()
  store.setStatus('countdown')
  for (let value = COUNTDOWN_FROM; value > 0; value--) {
    store.setCountdown(value)
    await new Promise((resolve) =>
      window.setTimeout(resolve, COUNTDOWN_TICK_MS),
    )
    if (useRecorderStore.getState().status !== 'countdown') return false
  }
  return true
}

async function discardTake(take: ActiveTake): Promise<void> {
  take.session.release()
  await take.writer.discard().catch(() => undefined)
}

export async function startRecording(): Promise<void> {
  const { boardElement } = useBoardStore.getState()
  const store = useRecorderStore.getState()
  if (!boardElement || store.status !== 'idle') return
  store.setStatus('arming')
  try {
    const session = await openCaptureSession(boardElement, store.isMicOn)
    const writer = await openTakeWriter(session.extension, session.mimeType)
    const take: ActiveTake = { session, writer, recorder: null }
    activeTake = take
    session.videoTrack.onended = () => void stopRecording()
    setPresenting(true)
    if (!(await runCountdown())) return
    take.recorder = startFileRecorder(
      session,
      writer,
      QUALITY_BITRATES[store.quality],
      () =>
        useUiStore
          .getState()
          .showToast('Disk write failed. Stop and check the folder.', 'error'),
    )
    window.addEventListener('beforeunload', warnBeforeLeaving)
    useRecorderStore.getState().markRunning()
  } catch (error) {
    if (activeTake) await discardTake(activeTake)
    activeTake = null
    useRecorderStore.getState().reset()
    useUiStore.getState().showToast(describeCaptureError(error), 'error')
  }
}

export function togglePause(): void {
  const store = useRecorderStore.getState()
  if (!activeTake?.recorder) return
  if (store.status === 'recording') {
    activeTake.recorder.pause()
    store.markPaused()
  } else if (store.status === 'paused') {
    activeTake.recorder.resume()
    store.markRunning()
  }
}

export async function stopRecording(): Promise<void> {
  const take = activeTake
  const store = useRecorderStore.getState()
  if (!take || store.status === 'saving') return
  activeTake = null
  window.removeEventListener('beforeunload', warnBeforeLeaving)
  // Stopping during the countdown cancels the take; nothing was recorded yet.
  if (!take.recorder) {
    store.reset()
    await discardTake(take)
    return
  }
  store.setStatus('saving')
  try {
    const video = await take.recorder.stop()
    useRecorderStore.getState().showTake({
      url: URL.createObjectURL(video),
      fileName: take.writer.fileName,
      savedPath: take.writer.savedPath,
    })
  } catch (error) {
    useUiStore.getState().showToast(describeCaptureError(error), 'error')
  } finally {
    useRecorderStore.getState().reset()
  }
}
