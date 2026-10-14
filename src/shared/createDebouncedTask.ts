export type DebouncedTask = {
  schedule: () => void
  flush: () => Promise<void>
  cancel: () => void
}

// Runs `task` once things go quiet, and never runs two copies at the same time,
// so a slow disk write cannot be overtaken by a newer one.
export function createDebouncedTask(
  task: () => Promise<void>,
  delayMs: number,
): DebouncedTask {
  let timer: number | undefined
  let running: Promise<void> = Promise.resolve()
  let pending = false

  const run = () => {
    timer = undefined
    if (!pending) return running
    pending = false
    running = running.then(task, task)
    return running
  }

  return {
    schedule() {
      pending = true
      window.clearTimeout(timer)
      timer = window.setTimeout(run, delayMs)
    },
    flush() {
      window.clearTimeout(timer)
      return run()
    },
    cancel() {
      pending = false
      window.clearTimeout(timer)
    },
  }
}
