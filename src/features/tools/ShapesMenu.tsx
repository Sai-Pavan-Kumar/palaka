import { PenLine, Shapes } from 'lucide-react'
import type { Editor } from 'tldraw'
import { PEN_TOOLS, SHAPE_TOOLS } from './toolList'
import { ToolMenu } from './ToolMenu'

type GroupMenuProps = {
  editor: Editor
  toolId: string
}

export function ShapesMenu(props: GroupMenuProps) {
  return (
    <ToolMenu
      {...props}
      tools={SHAPE_TOOLS}
      label="Shapes"
      shortcutHint="R · O · L"
      fallbackIcon={Shapes}
    />
  )
}

export function PenMenu(props: GroupMenuProps) {
  return (
    <ToolMenu
      {...props}
      tools={PEN_TOOLS}
      label="Pen, highlighter, laser"
      shortcutHint="D · Shift D · K"
      fallbackIcon={PenLine}
    />
  )
}
