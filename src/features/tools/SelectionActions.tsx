import { BringToFront, Copy, SendToBack, Trash2 } from 'lucide-react'
import type { Editor } from 'tldraw'
import { IconButton } from '../../shared/ui/IconButton'

// Shown only while something is selected, right next to its styles, so the
// common actions are one click away instead of hidden behind keys.
export function SelectionActions({ editor }: { editor: Editor }) {
  const run = (name: string, action: () => void) => {
    editor.markHistoryStoppingPoint(name)
    action()
    editor.focus()
  }
  const selected = () => editor.getSelectedShapeIds()

  return (
    <>
      <IconButton
        icon={Copy}
        label="Duplicate"
        shortcut="Ctrl D"
        onClick={() =>
          run('duplicate', () => editor.duplicateShapes(selected()))
        }
      />
      <IconButton
        icon={BringToFront}
        label="Bring to front"
        shortcut="]"
        onClick={() =>
          run('bring to front', () => editor.bringToFront(selected()))
        }
      />
      <IconButton
        icon={SendToBack}
        label="Send to back"
        shortcut="["
        onClick={() => run('send to back', () => editor.sendToBack(selected()))}
      />
      <IconButton
        icon={Trash2}
        label="Delete"
        shortcut="Del"
        tone="danger"
        onClick={() => run('delete', () => editor.deleteShapes(selected()))}
      />
    </>
  )
}
