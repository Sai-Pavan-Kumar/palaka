import { useValue, type Editor, type StyleProp } from 'tldraw'

// The value shared by the whole selection (or the next shape when nothing is
// selected); undefined when the selection mixes values.
export function useSharedValue<T>(
  editor: Editor,
  style: StyleProp<T>,
): T | undefined {
  return useValue(
    `style ${style.id}`,
    () => {
      const shared = editor.getSharedStyles().get(style)
      return shared?.type === 'shared' ? (shared.value as T) : undefined
    },
    [editor, style],
  )
}

// Styles apply to what is selected and to whatever is drawn next, so picking
// "red" then drawing keeps drawing red.
export function applyStyle<T>(editor: Editor, style: StyleProp<T>, value: T) {
  editor.markHistoryStoppingPoint('change style')
  if (editor.getSelectedShapeIds().length)
    editor.setStyleForSelectedShapes(style, value)
  editor.setStyleForNextShapes(style, value)
  editor.focus()
}

export function applyOpacity(editor: Editor, opacity: number) {
  editor.markHistoryStoppingPoint('change opacity')
  if (editor.getSelectedShapeIds().length)
    editor.setOpacityForSelectedShapes(opacity)
  editor.setOpacityForNextShapes(opacity)
  editor.focus()
}
