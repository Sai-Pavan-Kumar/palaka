import {
  createShapeId,
  getIndices,
  getPointsFromDrawSegments,
  type Editor,
  type TLDrawShape,
  type TLShapePartial,
} from 'tldraw'
import { useUiStore } from '../shell/uiStore'
import { recognizeShape, type RecognizedShape } from './recognizeShape'

function toCleanShape(
  stroke: TLDrawShape,
  shape: RecognizedShape,
): TLShapePartial {
  const { color, size } = stroke.props
  const id = createShapeId()
  if (shape.kind === 'line') {
    const [first, second] = getIndices(2)
    return {
      id,
      type: 'line',
      x: stroke.x + shape.start.x,
      y: stroke.y + shape.start.y,
      props: {
        color,
        size,
        points: {
          [first]: { id: first, index: first, x: 0, y: 0 },
          [second]: {
            id: second,
            index: second,
            x: shape.end.x - shape.start.x,
            y: shape.end.y - shape.start.y,
          },
        },
      },
    }
  }
  return {
    id,
    type: 'geo',
    x: stroke.x + shape.x,
    y: stroke.y + shape.y,
    // "draw" dash keeps a hand-made feel while the geometry becomes clean.
    props: {
      geo: shape.kind,
      w: shape.w,
      h: shape.h,
      color,
      size,
      dash: 'draw',
    },
  }
}

function replaceStroke(editor: Editor, stroke: TLDrawShape): void {
  if (editor.isDisposed || !editor.getShape(stroke.id)) return
  const { scaleX, scaleY, segments } = stroke.props
  const recognized = recognizeShape(
    getPointsFromDrawSegments(segments, scaleX, scaleY),
  )
  if (!recognized || stroke.rotation !== 0) return
  editor.run(() => {
    editor.deleteShapes([stroke.id])
    editor.createShape(toCleanShape(stroke, recognized))
  })
}

// Only the "clean shapes" pen mode converts strokes; normal pen writing is
// never touched. The swap waits one tick so the draw tool finishes first.
export function registerShapeCleanup(editor: Editor): () => void {
  return editor.sideEffects.registerAfterChangeHandler(
    'shape',
    (previous, next) => {
      if (next.type !== 'draw' || previous.type !== 'draw') return
      const finished = !previous.props.isComplete && next.props.isComplete
      if (!finished || !useUiStore.getState().isShapeCleanupOn) return
      editor.timers.setTimeout(() => replaceStroke(editor, next), 0)
    },
  )
}
