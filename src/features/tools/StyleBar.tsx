import { Code, Sparkles, Type } from 'lucide-react'
import { IconButton } from '../../shared/ui/IconButton'
import { applyStyle } from '../engine/boardActions'
import { useEngineStore } from '../engine/engineStore'
import { COLOR_KEYS, SIZE_KEYS } from '../engine/model/boardSpec'
import { getPalette } from '../engine/model/paper'
import type { ShapeStyle } from '../engine/model/shapeFactory'
import { setSession, useSessionStore } from '../engine/sessionStore'
import { FlowMenu } from './FlowMenu'
import { TableViewToggle } from './TableViewToggle'
import { MoreStylesMenu } from './MoreStylesMenu'
import { SelectionActions } from './SelectionActions'
import { useShownStyle, type ShownStyle } from './styleActions'
import './styleBar.css'

export function StyleBar() {
  const shown = useShownStyle()
  const tool = useSessionStore((s) => s.tool)
  if (!shown) return null
  const { fields, hasSelection } = shown
  const hasMoreStyles =
    fields.has('fill') || fields.has('dash') || fields.has('opacity')

  return (
    <div className="style-bar floating-bar chrome" aria-label="Style">
      {fields.has('color') && <ColorRow current={shown.values.color} />}
      {fields.has('size') && <span className="floating-bar__divider" />}
      {fields.has('size') && <SizeRow current={shown.values.size} />}
      {fields.has('font') && <span className="floating-bar__divider" />}
      {fields.has('font') && <FontToggle font={shown.values.font} />}
      {tool === 'pen' && !hasSelection && (
        <span className="floating-bar__divider" />
      )}
      {tool === 'pen' && !hasSelection && <CleanupToggle />}
      {hasMoreStyles && <span className="floating-bar__divider" />}
      {hasMoreStyles && <MoreStylesMenu shown={shown} />}
      {hasSelection && <FlowMenu />}
      {hasSelection && <TableViewToggle />}
      {hasSelection && <span className="floating-bar__divider" />}
      {hasSelection && <SelectionActions />}
    </div>
  )
}

// Swatches show the ink as it looks on the current paper.
function ColorRow({ current }: { current: ShapeStyle['color'] | undefined }) {
  const ink = useEngineStore((s) => getPalette(s.doc.paper).ink)
  return COLOR_KEYS.map((name) => (
    <button
      key={name}
      type="button"
      className={`style-bar__swatch ${current === name ? 'is-active' : ''}`}
      style={{ color: ink[name] }}
      aria-label={`Colour ${name}`}
      aria-pressed={current === name}
      onClick={() => applyStyle({ color: name })}
    />
  ))
}

function SizeRow({ current }: { current: ShapeStyle['size'] | undefined }) {
  return SIZE_KEYS.map((name, index) => (
    <button
      key={name}
      type="button"
      className={`style-bar__size ${current === name ? 'is-active' : ''}`}
      aria-label={`Size ${name.toUpperCase()}`}
      aria-pressed={current === name}
      onClick={() => applyStyle({ size: name })}
    >
      <span style={{ width: 4 + index * 4, height: 4 + index * 4 }} />
    </button>
  ))
}

// Brand text by default; one click turns a label into code (Geist Mono).
function FontToggle({ font }: { font: ShownStyle['values']['font'] }) {
  const isCode = font === 'code'
  return (
    <IconButton
      icon={isCode ? Code : Type}
      label={
        isCode ? 'Code font (click for text)' : 'Text font (click for code)'
      }
      isActive={isCode}
      onClick={() => applyStyle({ font: isCode ? 'brand' : 'code' })}
    />
  )
}

function CleanupToggle() {
  const isOn = useSessionStore((s) => s.isShapeCleanupOn)
  return (
    <IconButton
      icon={Sparkles}
      label="Clean shapes: boxes, circles and lines snap neat"
      isActive={isOn}
      onClick={() => setSession({ isShapeCleanupOn: !isOn })}
    />
  )
}
