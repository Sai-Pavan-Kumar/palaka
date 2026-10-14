import { useEffect } from 'react'
import { useUiStore } from './uiStore'
import './shell.css'

const TOAST_VISIBLE_MS = 4000
// Errors stay longer: they usually need reading, not just noticing.
const ERROR_VISIBLE_MS = 8000

export function Toast() {
  const toast = useUiStore((s) => s.toast)
  const dismissToast = useUiStore((s) => s.dismissToast)

  useEffect(() => {
    if (!toast) return
    const delay = toast.tone === 'error' ? ERROR_VISIBLE_MS : TOAST_VISIBLE_MS
    const timer = window.setTimeout(dismissToast, delay)
    return () => window.clearTimeout(timer)
  }, [toast, dismissToast])

  if (!toast) return null
  return (
    <div
      key={toast.id}
      className={`toast tone-${toast.tone}`}
      role={toast.tone === 'error' ? 'alert' : 'status'}
    >
      {toast.message}
    </div>
  )
}
