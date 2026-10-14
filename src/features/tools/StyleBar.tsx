import { Code, Sparkles, Type } from 'lucide-react'
import {
  DEFAULT_THEME,
  DefaultColorStyle,
  DefaultFontStyle,
  DefaultSizeStyle,
  useValue,
  type Editor,
  type TLDefaultColorStyle,
  type TLDefaultSizeStyle,
} from 'tldraw'
import { IconButton } from '../../shared/ui/IconButton'
import { useActiveEditor } from '../board/boardStore'
import { useUiStore } from '../shell/uiStore'
import { MoreStylesMenu } from './MoreStylesMenu'
import { SelectionActions } from './SelectionActions'
import { applyStyle, useSharedValue } from './styleActions'
import './styleBar.css'

// A short, high-contrast palette that reads well on a white board in video.
const COLORS: TLDefaultColorStyle[] = [
  'black',
  'blue',
  'red',
  'green',
  'orange',
  'violet',
]
const SIZES: TLDefaultSizeStyle[] = ['s', 'm', 'l', 'xl']
const STYLED_TOOLS = new Set([
  'draw',
  'highlight',
  'geo',
  'line',
  'arrow',
  'text',
])

export function StyleBar() {
  const editor = useActiveEditor()
  const toolId = useValue('tool id', () => editor.getCurrentToolId(), [editor])
  const hasSelection = useValue(
    'has selection',
    () => editor.getSelectedShapeIds().length > 0,
    [editor],
  )
  const color = useSharedValue(editor, DefaultColorStyle)
  const size = useSharedValue(editor, DefaultSizeStyle)
  const font = useSharedValue(editor, DefaultFontStyle)

  if (!hasSelection && !STYLED_TOOLS.has(toolId)) return null
  const showFont = font !== undefined || toolId === 'text'

  return (
    <div className="style-bar floating-bar chrome" aria-label="Style">
      <ColorAndSize editor={editor} color={color} size={size} />
      {showFont && <span className="floating-bar__divider" />}
      {showFont && <FontToggle editor={editor} font={font} />}
      {toolId === 'draw' && <span className="floating-bar__divider" />}
      {toolId === 'draw' && <CleanupToggle />}
      <span className="floating-bar__divider" />
      <MoreStylesMenu editor={editor} />
      {hasSelection && <span className="floating-bar__divider" />}
      {hasSelection && <SelectionActions editor={editor} />}
    </div>
  )
}

function ColorAndSize({
  editor,
  color,
  size,
}: {
  editor: Editor
  color: TLDefaultColorStyle | undefined
  size: TLDefaultSizeStyle | undefined
}) {
  return (
    <>
      {COLORS.map((name) => (
        <button
          key={name}
          type="button"
          className={`style-bar__swatch ${color === name ? 'is-active' : ''}`}
          style={{ color: DEFAULT_THEME.colors.light[name].solid }}
          aria-label={`Color ${name}`}
          onClick={() => applyStyle(editor, DefaultColorStyle, name)}
        />
      ))}
      <span className="floating-bar__divider" />
      {SIZES.map((name, index) => (
        <button
          key={name}
          type="button"
          className={`style-bar__size ${size === name ? 'is-active' : ''}`}
          aria-label={`Size ${name.toUpperCase()}`}
          onClick={() => applyStyle(editor, DefaultSizeStyle, name)}
        >
          <span style={{ width: 4 + index * 4, height: 4 + index * 4 }} />
        </button>
      ))}
    </>
  )
}

function FontToggle({
  editor,
  font,
}: {
  editor: Editor
  font: string | undefined
}) {
  // Brand text by default; one click turns a label into code (Geist Mono).
  const isCode = font === 'mono'
  return (
    <IconButton
      icon={isCode ? Code : Type}
      label={
        isCode ? 'Code font (click for text)' : 'Text font (click for code)'
      }
      isActive={isCode}
      onClick={() =>
        applyStyle(editor, DefaultFontStyle, isCode ? 'draw' : 'mono')
      }
    />
  )
}

function CleanupToggle() {
  const isShapeCleanupOn = useUiStore((s) => s.isShapeCleanupOn)
  const toggleShapeCleanup = useUiStore((s) => s.toggleShapeCleanup)
  return (
    <IconButton
      icon={Sparkles}
      label="Clean shapes: boxes, circles and lines snap neat"
      isActive={isShapeCleanupOn}
      onClick={toggleShapeCleanup}
    />
  )
}
