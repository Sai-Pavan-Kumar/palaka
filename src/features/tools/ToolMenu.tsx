import type { LucideIcon } from 'lucide-react'
import { setTool, useSessionStore } from '../engine/sessionStore'
import { IconButton } from '../../shared/ui/IconButton'
import { Popover } from '../../shared/ui/Popover'
import type { ToolDefinition } from './toolList'

type ToolMenuProps = {
  tools: ToolDefinition[]
  label: string
  shortcutHint: string
  fallbackIcon: LucideIcon
}

// Groups related tools behind one button (keeps the bar under 10 buttons).
// The button shows the group's active tool, so you can see what you hold.
export function ToolMenu({
  tools,
  label,
  shortcutHint,
  fallbackIcon,
}: ToolMenuProps) {
  const toolId = useSessionStore((s) => s.tool)
  const activeTool = tools.find((tool) => tool.id === toolId)

  return (
    <Popover
      trigger={({ toggle }) => (
        <IconButton
          icon={activeTool?.icon ?? fallbackIcon}
          label={label}
          shortcut={shortcutHint}
          isActive={!!activeTool}
          onClick={() => {
            if (activeTool) setTool('select')
            else toggle()
          }}
        />
      )}
    >
      {(close) =>
        tools.map((tool) => (
          <button
            key={tool.id}
            type="button"
            className={`menu-item ${tool.id === toolId ? 'is-active' : ''}`}
            onClick={() => {
              if (tool.id === toolId) setTool('select')
              else setTool(tool.id)
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
