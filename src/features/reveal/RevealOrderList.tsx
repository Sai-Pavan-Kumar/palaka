import { ArrowDown, ArrowUp, Pin, PinOff } from 'lucide-react'
import { useValue, type TLShape } from 'tldraw'
import { IconButton } from '../../shared/ui/IconButton'
import { useActiveEditor } from '../board/boardStore'
import { describeShape } from './describeShape'
import {
  getRevealStep,
  moveRevealStep,
  toggleAlwaysVisible,
} from './revealModel'
import './reveal.css'

type OrderRow = { shape: TLShape; step: number | null; label: string }

function useOrderRows(): OrderRow[] {
  const editor = useActiveEditor()
  return useValue(
    'reveal order rows',
    () => {
      const rows = editor
        .getSortedChildIdsForParent(editor.getCurrentPageId())
        .map((id) => editor.getShape(id)!)
        .map((shape) => ({
          shape,
          step: getRevealStep(shape),
          label: describeShape(editor, shape),
        }))
      // Always-visible objects first (they are on screen from the start),
      // then the reveal steps in the order the audience will see them.
      return rows.sort((a, b) => (a.step ?? 0) - (b.step ?? 0))
    },
    [editor],
  )
}

function OrderRowItem({
  row,
  isSelected,
}: {
  row: OrderRow
  isSelected: boolean
}) {
  const editor = useActiveEditor()
  const { shape, step, label } = row
  return (
    <li className={`order-list__item ${isSelected ? 'is-selected' : ''}`}>
      <span className={`order-list__step ${step === null ? 'is-pinned' : ''}`}>
        {step ?? <Pin size={14} aria-label="Always visible" />}
      </span>
      <button
        type="button"
        className="order-list__name"
        onClick={() => editor.select(shape.id)}
      >
        {label}
      </button>
      <span className="order-list__actions">
        {step !== null && (
          <>
            <IconButton
              icon={ArrowUp}
              label="Earlier"
              onClick={() => moveRevealStep(editor, shape.id, -1)}
            />
            <IconButton
              icon={ArrowDown}
              label="Later"
              onClick={() => moveRevealStep(editor, shape.id, 1)}
            />
          </>
        )}
        <IconButton
          icon={step === null ? PinOff : Pin}
          label={step === null ? 'Make it a step' : 'Always visible'}
          onClick={() => toggleAlwaysVisible(editor, shape.id)}
        />
      </span>
    </li>
  )
}

export function RevealOrderList() {
  const editor = useActiveEditor()
  const rows = useOrderRows()
  const selectedIds = useValue(
    'selected ids',
    () => editor.getSelectedShapeIds(),
    [editor],
  )

  if (rows.length === 0) {
    return (
      <p className="order-list__empty">
        Nothing on this page yet. Each object you add becomes the next step.
      </p>
    )
  }
  return (
    <ol className="order-list">
      {rows.map((row) => (
        <OrderRowItem
          key={row.shape.id}
          row={row}
          isSelected={selectedIds.includes(row.shape.id)}
        />
      ))}
    </ol>
  )
}
