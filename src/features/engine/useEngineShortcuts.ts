import { useEffect } from 'react'
import { hasModifier, isTypingTarget } from '../../shared/keyboard'
import { toolForKey } from '../tools/toolList'
import {
  deleteSelected,
  duplicateSelected,
  moveSelectedToEdge,
  selectAllOnPage,
} from './boardActions'
import { useEngineStore } from './engineStore'
import { selectShapes, setTool } from './sessionStore'

function handleCommandKey(event: KeyboardEvent, key: string): boolean {
  const store = useEngineStore.getState()
  if ((key === 'z' && event.shiftKey) || key === 'y') store.redo()
  else if (key === 'z') store.undo()
  else if (key === 'd') duplicateSelected()
  else if (key === 'a') selectAllOnPage()
  else return false
  return true
}

function handlePlainKey(event: KeyboardEvent, key: string): boolean {
  const tool = toolForKey(key, event.shiftKey)
  if (tool) setTool(tool)
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
