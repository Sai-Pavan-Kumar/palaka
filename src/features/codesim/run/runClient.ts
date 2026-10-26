import type { RunReply, RunRequest } from '../worker/pyWorker'
import type { TraceResult } from './traceTypes'

// An honest loop finishes well under this; past it we assume `while True`.
const RUN_TIMEOUT_MS = 5000

export const TIMEOUT_MESSAGE =
  'The code ran for over 5 seconds and was stopped. Is there an endless loop?'

let worker: Worker | null = null
let nextId = 1

function getWorker(): Worker {
  worker ??= new Worker(new URL('../worker/pyWorker.ts', import.meta.url), {
    type: 'module',
  })
  return worker
}

// A stuck Python loop cannot be interrupted from outside, so the only way
// out is to kill the worker. The next run boots a fresh one (from cache).
function killWorker(): void {
  worker?.terminate()
  worker = null
}

export function runCode(
  source: string,
  call: string,
  onStarted: () => void,
): Promise<TraceResult> {
  const id = nextId++
  const active = getWorker()
  return new Promise((resolve, reject) => {
    let timer: ReturnType<typeof setTimeout> | undefined
    const finish = () => {
      clearTimeout(timer)
      active.removeEventListener('message', onMessage)
      active.removeEventListener('error', onError)
    }
    const onError = (event: ErrorEvent) => {
      finish()
      killWorker()
      reject(new Error(`Python could not start. ${event.message ?? ''}`))
    }
    const onMessage = ({ data }: MessageEvent<RunReply>) => {
      if (data.id !== id) return
      if (data.type === 'started') {
        onStarted()
        timer = setTimeout(() => {
          finish()
          killWorker()
          reject(new Error(TIMEOUT_MESSAGE))
        }, RUN_TIMEOUT_MS)
        return
      }
      finish()
      if (data.type === 'done') resolve(JSON.parse(data.json) as TraceResult)
      else reject(new Error(data.message))
    }
    active.addEventListener('message', onMessage)
    active.addEventListener('error', onError)
    active.postMessage({ id, source, call } satisfies RunRequest)
  })
}
