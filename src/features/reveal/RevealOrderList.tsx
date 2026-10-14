import { ArrowDown, ArrowUp, Pin, PinOff } from 'lucide-react'
import { IconButton } from '../../shared/ui/IconButton'
import { useEngineStore } from '../engine/engineStore'
import { findPage } from '../engine/model/documentOps'
import type { BoardDocument, Page, Shape } from '../engine/model/types'
import { selectShapes, setTool, useSessionStore } from '../engine/sessionStore'
import { describeShape } from './describeShape'
import { moveRevealStep, toggleAlwaysVisible } from './revealModel'
import './reveal.css'

type OrderRow = { shape: Shape; step: number | null; label: string }

// Always-visible objects first (they are on screen from the start), then the
// reveal steps in the order the audience will see them.
function buildRows(doc: BoardDocument, page: Page): OrderRow[] {
  return page.order
    .map((id) => page.shapes[id])
    .map((shape) => ({
      shape,
      step: shape.revealStep ?? null,
      label: describeShape(doc, shape),
    }))
    .sort((a, b) => (a.step ?? 0) - (b.step ?? 0))
}

function OrderRowItem({
  row,
  isSelected,
}: {
  row: OrderRow
  isSelected: boolean
}) {
  const { shape, step, label } = row
  return (
    <li className={`order-list__item ${isSelected ? 'is-selected' : ''}`}>
      <span className={`order-list__step ${step === null ? 'is-pinned' : ''}`}>
        {step ?? <Pin size={14} aria-label="Always visible" />}
      </span>
      <button
        type="button"
        className="order-list__name"
        onClick={() => {
          setTool('select')
          selectShapes([shape.id])
        }}
      >
        {label}
      </button>
      <span className="order-list__actions">
        {step !== null && (
          <>
            <IconButton
              icon={ArrowUp}
              label="Earlier"
              onClick={() => moveRevealStep(shape.id, -1)}
            />
            <IconButton
              icon={ArrowDown}
              label="Later"
              onClick={() => moveRevealStep(shape.id, 1)}
            />
          </>
        )}
        <IconButton
          icon={step === null ? PinOff : Pin}
          label={step === null ? 'Make it a step' : 'Always visible'}
          onClick={() => toggleAlwaysVisible(shape.id)}
        />
      </span>
    </li>
  )
}

export function RevealOrderList() {
  const doc = useEngineStore((s) => s.doc)
  const pageId = useSessionStore((s) => s.pageId)
  const selectedIds = useSessionStore((s) => s.selectedIds)
  const page = findPage(doc, pageId)
  const rows = page ? buildRows(doc, page) : []

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
