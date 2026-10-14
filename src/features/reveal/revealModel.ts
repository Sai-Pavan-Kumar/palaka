import {
  isPageId,
  type Editor,
  type JsonObject,
  type TLPageId,
  type TLShape,
  type TLShapeId,
} from 'tldraw'

// Reveal progress is session state (instance meta), so stepping through a
// talk never lands in undo history or in board.json.
type RevealSession = {
  presenting: boolean
  revealedUpTo: Record<string, number>
}

export function getRevealSession(editor: Editor): RevealSession {
  const meta = editor.getInstanceState().meta
  return {
    presenting: meta.presenting === true,
    revealedUpTo:
      (meta.revealedUpTo as Record<string, number> | undefined) ?? {},
  }
}

function setRevealSession(editor: Editor, session: RevealSession): void {
  const meta = editor.getInstanceState().meta
  editor.updateInstanceState(
    { meta: { ...meta, ...session } as JsonObject },
    { history: 'ignore' },
  )
}

export function getRevealStep(shape: TLShape): number | null {
  const step = shape.meta.revealStep
  return typeof step === 'number' ? step : null
}

function isTopLevel(shape: TLShape): boolean {
  return isPageId(shape.parentId)
}

// Passed to tldraw as getShapeVisibility. It reads editor state only, so
// tldraw re-evaluates it reactively whenever the reveal session changes.
export function getRevealVisibility(shape: TLShape, editor: Editor) {
  const { presenting, revealedUpTo } = getRevealSession(editor)
  const step = getRevealStep(shape)
  if (!presenting || step === null || !isTopLevel(shape)) return 'inherit'
  return step <= (revealedUpTo[shape.parentId] ?? 0) ? 'inherit' : 'hidden'
}

export function getSteppedShapes(editor: Editor, pageId: TLPageId): TLShape[] {
  return editor
    .getSortedChildIdsForParent(pageId)
    .map((id) => editor.getShape(id))
    .filter(
      (shape): shape is TLShape => !!shape && getRevealStep(shape) !== null,
    )
    .sort((a, b) => getRevealStep(a)! - getRevealStep(b)!)
}

export function getStepCount(editor: Editor, pageId: TLPageId): number {
  return getSteppedShapes(editor, pageId).length
}

function getHighestStep(editor: Editor, pageId: TLPageId): number {
  const steps = getSteppedShapes(editor, pageId).map((s) => getRevealStep(s)!)
  return steps.length ? Math.max(...steps) : 0
}

// Deletes leave gaps (1, 2, 5); presenting needs 1..n so each key press shows
// exactly one object.
function normalizeSteps(editor: Editor, pageId: TLPageId): void {
  const updates = getSteppedShapes(editor, pageId)
    .map((shape, index) => ({ shape, step: index + 1 }))
    .filter(({ shape, step }) => getRevealStep(shape) !== step)
    .map(({ shape, step }) => ({
      id: shape.id,
      type: shape.type,
      meta: { ...shape.meta, revealStep: step },
    }))
  if (updates.length) editor.updateShapes(updates)
}

export function setPresenting(editor: Editor, presenting: boolean): void {
  editor.run(
    () => {
      if (presenting) {
        editor.getPages().forEach((page) => normalizeSteps(editor, page.id))
        editor.selectNone()
      }
      setRevealSession(editor, { presenting, revealedUpTo: {} })
    },
    { history: 'ignore' },
  )
}

export function stepReveal(editor: Editor, direction: 1 | -1): void {
  const session = getRevealSession(editor)
  const pageId = editor.getCurrentPageId()
  const current = session.revealedUpTo[pageId] ?? 0
  const next = Math.min(
    Math.max(current + direction, 0),
    getStepCount(editor, pageId),
  )
  if (next === current) return
  setRevealSession(editor, {
    ...session,
    revealedUpTo: { ...session.revealedUpTo, [pageId]: next },
  })
}

// New objects join the end of the reveal order while preparing. Objects drawn
// live during a talk get no step, so they never vanish on the next key press.
export function withRevealStep(editor: Editor, shape: TLShape): TLShape {
  if (!isPageId(shape.parentId)) return shape
  const { revealStep: _previous, ...meta } = shape.meta
  if (getRevealSession(editor).presenting) return { ...shape, meta }
  const step = getHighestStep(editor, shape.parentId) + 1
  return { ...shape, meta: { ...meta, revealStep: step } }
}

export function moveRevealStep(
  editor: Editor,
  shapeId: TLShapeId,
  offset: 1 | -1,
): void {
  const shape = editor.getShape(shapeId)
  if (!shape || !isPageId(shape.parentId)) return
  const ordered = getSteppedShapes(editor, shape.parentId)
  const index = ordered.findIndex((s) => s.id === shapeId)
  const neighbour = ordered[index + offset]
  if (index < 0 || !neighbour) return
  editor.markHistoryStoppingPoint('reorder reveal')
  editor.updateShapes([
    {
      id: shape.id,
      type: shape.type,
      meta: { ...shape.meta, revealStep: getRevealStep(neighbour) },
    },
    {
      id: neighbour.id,
      type: neighbour.type,
      meta: { ...neighbour.meta, revealStep: getRevealStep(shape) },
    },
  ])
}

export function toggleAlwaysVisible(editor: Editor, shapeId: TLShapeId): void {
  const shape = editor.getShape(shapeId)
  if (!shape || !isPageId(shape.parentId)) return
  const { revealStep: _previous, ...meta } = shape.meta
  const nextMeta =
    getRevealStep(shape) === null
      ? { ...meta, revealStep: getHighestStep(editor, shape.parentId) + 1 }
      : meta
  editor.markHistoryStoppingPoint('toggle always visible')
  editor.updateShape({ id: shape.id, type: shape.type, meta: nextMeta })
}
