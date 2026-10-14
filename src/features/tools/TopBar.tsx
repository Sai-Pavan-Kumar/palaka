import { Presentation, Undo2 } from 'lucide-react'
import { useValue, type Editor } from 'tldraw'
import { IconButton } from '../../shared/ui/IconButton'
import { useActiveEditor } from '../board/boardStore'
import { ExportMenu } from '../export/ExportMenu'
import { RecordControls } from '../recorder/RecordControls'
import { useRecorderStore } from '../recorder/recorderStore'
import { getRevealSession, setPresenting } from '../reveal/revealModel'
import { PenMenu, ShapesMenu } from './ShapesMenu'
import { MAIN_TOOLS, TRAILING_TOOLS, type ToolDefinition } from './toolList'
import './topBar.css'

function ToolButton({
  tool,
  editor,
  toolId,
}: {
  tool: ToolDefinition
  editor: Editor
  toolId: string
}) {
  return (
    <IconButton
      icon={tool.icon}
      label={tool.label}
      shortcut={tool.shortcut}
      isActive={tool.isActive(toolId, editor)}
      onClick={() => {
        tool.select(editor)
        // Clicks outside the canvas would otherwise leave tldraw's shortcuts asleep.
        editor.focus()
      }}
    />
  )
}

function ToolGroup({ editor }: { editor: Editor }) {
  const toolId = useValue('tool id', () => editor.getCurrentToolId(), [editor])
  const canUndo = useValue('can undo', () => editor.getCanUndo(), [editor])

  return (
    <nav className="floating-bar" aria-label="Tools">
      {MAIN_TOOLS.map((tool) => (
        <ToolButton key={tool.id} tool={tool} editor={editor} toolId={toolId} />
      ))}
      <PenMenu editor={editor} toolId={toolId} />
      <ShapesMenu editor={editor} toolId={toolId} />
      {TRAILING_TOOLS.map((tool) => (
        <ToolButton key={tool.id} tool={tool} editor={editor} toolId={toolId} />
      ))}
      <span className="floating-bar__divider" />
      <IconButton
        icon={Undo2}
        label="Undo"
        shortcut="Ctrl Z"
        disabled={!canUndo}
        onClick={() => editor.undo()}
      />
    </nav>
  )
}

function SessionGroup({ editor }: { editor: Editor }) {
  const isPresenting = useValue(
    'presenting',
    () => getRevealSession(editor).presenting,
    [editor],
  )
  const isRecording = useRecorderStore((s) => s.status !== 'idle')

  return (
    <div className="floating-bar">
      <IconButton
        icon={Presentation}
        label={isPresenting ? 'Stop presenting' : 'Present'}
        shortcut="P"
        isActive={isPresenting}
        disabled={isRecording}
        onClick={() => setPresenting(editor, !isPresenting)}
      />
      <ExportMenu editor={editor} disabled={isPresenting} />
      <RecordControls />
    </div>
  )
}

export function TopBar() {
  const editor = useActiveEditor()
  return (
    <header className="top-bar chrome">
      <ToolGroup editor={editor} />
      <SessionGroup editor={editor} />
    </header>
  )
}
