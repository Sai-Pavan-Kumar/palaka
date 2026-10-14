import { BringToFront, Copy, SendToBack, Trash2 } from 'lucide-react'
import { IconButton } from '../../shared/ui/IconButton'
import {
  deleteSelected,
  duplicateSelected,
  moveSelectedToEdge,
} from '../engine/boardActions'

// Shown only while something is selected, right next to its styles, so the
// common actions are one click away instead of hidden behind keys.
export function SelectionActions() {
  return (
    <>
      <IconButton
        icon={Copy}
        label="Duplicate"
        shortcut="Ctrl D"
        onClick={duplicateSelected}
      />
      <IconButton
        icon={BringToFront}
        label="Bring to front"
        shortcut="]"
        onClick={() => moveSelectedToEdge('front')}
      />
      <IconButton
        icon={SendToBack}
        label="Send to back"
        shortcut="["
        onClick={() => moveSelectedToEdge('back')}
      />
      <IconButton
        icon={Trash2}
        label="Delete"
        shortcut="Del"
        tone="danger"
        onClick={deleteSelected}
      />
    </>
  )
}
