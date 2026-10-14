import { PenLine, Shapes } from 'lucide-react'
import { PEN_TOOLS, SHAPE_TOOLS } from './toolList'
import { ToolMenu } from './ToolMenu'

export function ShapesMenu() {
  return (
    <ToolMenu
      tools={SHAPE_TOOLS}
      label="Shapes"
      shortcutHint="R · O · L"
      fallbackIcon={Shapes}
    />
  )
}

export function PenMenu() {
  return (
    <ToolMenu
      tools={PEN_TOOLS}
      label="Pen, highlighter, laser"
      shortcutHint="D · Shift D · K"
      fallbackIcon={PenLine}
    />
  )
}
