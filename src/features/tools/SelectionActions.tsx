import {
  BringToFront,
  Copy,
  Focus,
  Lock,
  SendToBack,
  Trash2,
  Unlock,
} from 'lucide-react'
import { IconButton } from '../../shared/ui/IconButton'
import {
  deleteSelected,
  duplicateSelected,
  getCurrentPage,
  moveSelectedToEdge,
  toggleLockSelected,
} from '../engine/boardActions'
import { useEngineStore } from '../engine/engineStore'
import { useSessionStore } from '../engine/sessionStore'

function LayerOrderActions() {
  return (
    <>
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
    </>
  )
}

function LockAndSpotlightActions({
  isLocked,
  isSpotlighted,
  onToggleSpotlight,
}: {
  isLocked: boolean
  isSpotlighted: boolean
  onToggleSpotlight: () => void
}) {
  return (
    <>
      <IconButton
        icon={Focus}
        label={isSpotlighted ? 'Exit spotlight' : 'Spotlight'}
        shortcut="S"
        isActive={isSpotlighted}
        onClick={onToggleSpotlight}
      />
      <IconButton
        icon={isLocked ? Unlock : Lock}
        label={isLocked ? 'Unlock' : 'Lock'}
        shortcut="L"
        isActive={isLocked}
        onClick={toggleLockSelected}
      />
    </>
  )
}

// Shown only while something is selected, right next to its styles, so the
// common actions are one click away instead of hidden behind keys.
export function SelectionActions() {
  const selectedIds = useSessionStore((s) => s.selectedIds)
  const spotlightId = useSessionStore((s) => s.spotlightId)
  const isSpotlighted =
    selectedIds.length === 1 && spotlightId === selectedIds[0]
  const isLocked = useEngineStore(() => {
    const page = getCurrentPage()
    return (
      selectedIds.length > 0 &&
      selectedIds.every((id) => page?.shapes[id]?.locked)
    )
  })

  return (
    <>
      <IconButton
        icon={Copy}
        label="Duplicate"
        shortcut="Ctrl D"
        onClick={duplicateSelected}
      />
      <LockAndSpotlightActions
        isLocked={isLocked}
        isSpotlighted={isSpotlighted}
        onToggleSpotlight={() => {
          if (selectedIds.length === 0) return
          const next = isSpotlighted ? null : selectedIds[0]
          useSessionStore.setState({ spotlightId: next })
        }}
      />
      <LayerOrderActions />
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
