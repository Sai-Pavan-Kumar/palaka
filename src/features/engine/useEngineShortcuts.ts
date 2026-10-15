import { useEffect } from 'react'
import { hasModifier, isTypingTarget } from '../../shared/keyboard'
import { toolForKey } from '../tools/toolList'
import {
  copySelected,
  cutSelected,
  deleteSelected,
  duplicateSelected,
  moveSelectedToEdge,
  pasteClipboard,
  selectAllOnPage,
  toggleLockSelected,
} from './boardActions'
import { useEngineStore } from './engineStore'
import { selectShapes, toggleTool, useSessionStore } from './sessionStore'

function handleCommandKey(event: KeyboardEvent, key: string): boolean {
  const store = useEngineStore.getState()
  if ((key === 'z' && event.shiftKey) || key === 'y') store.redo()
  else if (key === 'z') store.undo()
  else if (key === 'd') duplicateSelected()
  else if (key === 'c') copySelected()
  else if (key === 'v') pasteClipboard()
  else if (key === 'x') cutSelected()
  else if (key === 'a') selectAllOnPage()
  else return false
  return true
}

function handlePlainKey(event: KeyboardEvent, key: string): boolean {
  const { selectedIds, spotlightId } = useSessionStore.getState()
  if (key === 'escape' && spotlightId) {
    useSessionStore.setState({ spotlightId: null })
    return true
  }
  if (key === 's' && selectedIds.length > 0) {
    const next = spotlightId === selectedIds[0] ? null : selectedIds[0]
    useSessionStore.setState({ spotlightId: next })
    return true
  }
  if (key === 'l' && selectedIds.length > 0) {
    toggleLockSelected()
    return true
  }
  const tool = toolForKey(key, event.shiftKey)
  if (tool) toggleTool(tool)
  else if (key === 'delete' || key === 'backspace') deleteSelected()
  else if (key === 'escape') selectShapes([])
  else if (key === ']') moveSelectedToEdge('front')
  else if (key === '[') moveSelectedToEdge('back')
  else return false
  return true
}

// Drawing and editing keys. Presenting, pages and focus mode live in the
// shell's global shortcuts, which run first.
export function useEngineShortcuts() {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (isTypingTarget(event.target) || event.defaultPrevented) return
      const key = event.key.toLowerCase()
      const isCommand = event.ctrlKey || event.metaKey
      const handled = isCommand
        ? !event.altKey && handleCommandKey(event, key)
        : !hasModifier(event) && handlePlainKey(event, key)
      if (handled) event.preventDefault()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])
}
