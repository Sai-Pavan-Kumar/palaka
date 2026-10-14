import type { LucideIcon } from 'lucide-react'
import type { Editor } from 'tldraw'
import { IconButton } from '../../shared/ui/IconButton'
import { Popover } from '../../shared/ui/Popover'
import type { ToolDefinition } from './toolList'

type ToolMenuProps = {
  editor: Editor
  toolId: string
  tools: ToolDefinition[]
  label: string
  shortcutHint: string
  fallbackIcon: LucideIcon
}

// Groups related tools behind one button (keeps the bar under 10 buttons).
// The button shows the group's active tool, so you can see what you hold.
export function ToolMenu({
  editor,
  toolId,
  tools,
  label,
  shortcutHint,
  fallbackIcon,
}: ToolMenuProps) {
  const activeTool = tools.find((tool) => tool.isActive(toolId, editor))

  return (
    <Popover
      trigger={({ toggle }) => (
        <IconButton
          icon={activeTool?.icon ?? fallbackIcon}
          label={label}
          shortcut={shortcutHint}
          isActive={!!activeTool}
          onClick={toggle}
        />
      )}
    >
      {(close) =>
        tools.map((tool) => (
          <button
            key={tool.id}
            type="button"
            className={`menu-item ${tool.isActive(toolId, editor) ? 'is-active' : ''}`}
            onClick={() => {
              tool.select(editor)
              editor.focus()
              close()
            }}
          >
            <tool.icon size={18} strokeWidth={1.75} aria-hidden />
            {tool.label}
            <span className="menu-item__hint">{tool.shortcut}</span>
          </button>
        ))
      }
    </Popover>
  )
}
