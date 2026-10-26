import type { PyodideAPI } from 'pyodide'
import TRACER_SOURCE from './tracer.py?raw'

export type RunRequest = { id: number; source: string; call: string }
export type RunReply =
  | { id: number; type: 'started' }
  | { id: number; type: 'done'; json: string }
  | { id: number; type: 'failed'; message: string }

type WorkerScope = {
  onmessage: ((event: MessageEvent<RunRequest>) => void) | null
  postMessage: (reply: RunReply) => void
  location: Location
}

const scope = globalThis as unknown as WorkerScope

// Pyodide is served from our own origin (scripts/copy-pyodide.mjs) and
// imported at runtime, so Vite never bundles the 13 MB runtime into the app.
async function boot(): Promise<PyodideAPI> {
  const indexURL = new URL(
    `${import.meta.env.BASE_URL}pyodide/`,
    scope.location.origin,
  ).href
  const runtime = (await import(
    /* @vite-ignore */ `${indexURL}pyodide.mjs`
  )) as typeof import('pyodide')
  const py = await runtime.loadPyodide({ indexURL })
  py.runPython(TRACER_SOURCE)
  return py
}

let booting: Promise<PyodideAPI> | null = null

scope.onmessage = async ({ data }) => {
  const { id, source, call } = data
  try {
    booting ??= boot()
    const py = await booting
    // The page starts its timeout only now, so a slow first download is
    // never mistaken for an endless loop.
    scope.postMessage({ id, type: 'started' })
    const runTraced = py.globals.get('run_traced')
    const json = runTraced(source, call) as string
    runTraced.destroy()
    scope.postMessage({ id, type: 'done', json })
  } catch (error) {
    booting = null
    const message = error instanceof Error ? error.message : String(error)
    scope.postMessage({ id, type: 'failed', message })
  }
}
