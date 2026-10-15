import { ArrowDown, ArrowUp, Pin, PinOff } from 'lucide-react'
import { IconButton } from '../../shared/ui/IconButton'
import { useEngineStore } from '../engine/engineStore'
import { findPage } from '../engine/model/documentOps'
import type { BoardDocument, Page, Shape } from '../engine/model/types'
import { selectShapes, setTool, useSessionStore } from '../engine/sessionStore'
import type { StepKind } from '../engine/model/revealSteps'
import { describeShape } from './describeShape'
import { moveRevealStep, toggleAlwaysVisible } from './revealModel'
import './reveal.css'

type OrderRow = {
  shape: Shape
  kind: StepKind
  step: number | null
  label: string
}

// Always-visible objects first (they are on screen from the start), then the
function isOrphaned(shape: Shape, page: Page): boolean {
  if (shape.type === 'tableState') {
    return (
      !page.shapes[shape.tableId] || page.shapes[shape.tableId].type !== 'table'
    )
  }
  if (shape.type === 'highlight') {
    return shape.targets.some(
      (t) => !page.shapes[t.tableId] || page.shapes[t.tableId].type !== 'table',
    )
  }
  return false
}

// Always-visible objects first (they are on screen from the start), then the
// reveal steps in the order the audience will see them. A flowing connector
// gets a second row for "dots start moving".
function buildRows(doc: BoardDocument, page: Page): OrderRow[] {
  return page.order
    .map((id) => page.shapes[id])
    .filter(
      (shape): shape is Shape => Boolean(shape) && !isOrphaned(shape, page),
    )
    .flatMap((shape) => {
      const label = describeShape(doc, shape)
      const rows: OrderRow[] = [
        { shape, kind: 'shape', step: shape.revealStep ?? null, label },
      ]
      if (shape.type === 'line' && shape.flow) {
        const step = shape.flow.step ?? null
        rows.push({ shape, kind: 'flow', step, label: `Flow: ${label}` })
      }
      return rows
    })
    .sort((a, b) => (a.step ?? 0) - (b.step ?? 0))
}

function pinLabel(kind: StepKind, step: number | null): string {
  if (step === null) return 'Make it a step'
  return kind === 'flow' ? 'Moves from the start' : 'Always visible'
}

function OrderRowItem({
  row,
  isSelected,
}: {
  row: OrderRow
  isSelected: boolean
}) {
  const { shape, kind, step, label } = row
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
              onClick={() => moveRevealStep(shape.id, kind, -1)}
            />
            <IconButton
              icon={ArrowDown}
              label="Later"
              onClick={() => moveRevealStep(shape.id, kind, 1)}
            />
          </>
        )}
        <IconButton
          icon={step === null ? PinOff : Pin}
          label={pinLabel(kind, step)}
          onClick={() => toggleAlwaysVisible(shape.id, kind)}
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
          key={`${row.shape.id}-${row.kind}`}
          row={row}
          isSelected={selectedIds.includes(row.shape.id)}
        />
      ))}
    </ol>
  )
}
