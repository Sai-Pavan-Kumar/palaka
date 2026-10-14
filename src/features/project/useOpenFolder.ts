import { useState } from 'react'
import { useUiStore } from '../shell/uiStore'
import { openFolderIntoBoard } from './openFolderIntoBoard'
import { isFolderAccessSupported } from './openProject'

function describeOpenError(error: unknown): string {
  if (error instanceof SyntaxError) {
    return 'board.json in this folder is damaged, so nothing was loaded or overwritten.'
  }
  return error instanceof Error
    ? error.message
    : 'The folder could not be opened.'
}

export function useOpenFolder() {
  const [isOpening, setIsOpening] = useState(false)

  const openFolder = async () => {
    const { showToast } = useUiStore.getState()
    setIsOpening(true)
    try {
      const opened = await openFolderIntoBoard()
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
