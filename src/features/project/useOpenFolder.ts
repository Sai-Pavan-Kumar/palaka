import { useState } from 'react'
import { useActiveEditor } from '../board/boardStore'
import { useUiStore } from '../shell/uiStore'
import { openFolderIntoBoard } from './openFolderIntoBoard'
import { isFolderAccessSupported } from './openProject'

function describeOpenError(error: unknown): string {
  if (error instanceof SyntaxError) {
    return 'A file in this folder (board.json or project.json) is damaged, so nothing was loaded or overwritten.'
  }
  return error instanceof Error
    ? error.message
    : 'The folder could not be opened.'
}

export function useOpenFolder() {
  const editor = useActiveEditor()
  const [isOpening, setIsOpening] = useState(false)

  const openFolder = async () => {
    const { showToast } = useUiStore.getState()
    setIsOpening(true)
    try {
      const opened = await openFolderIntoBoard(editor)
      if (opened)
        showToast('Folder opened. The board now saves into it.', 'success')
    } catch (error) {
      console.error('Open folder failed', error)
      showToast(describeOpenError(error), 'error')
    } finally {
      setIsOpening(false)
    }
  }
  return { isOpening, openFolder, isSupported: isFolderAccessSupported() }
}
