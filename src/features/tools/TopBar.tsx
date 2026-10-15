import { Camera, CameraOff, Presentation, Undo2 } from 'lucide-react'
import { IconButton } from '../../shared/ui/IconButton'
import { useFacecamStore } from '../facecam/facecamStore'
import { useEngineStore } from '../engine/engineStore'
import { toggleTool, useSessionStore } from '../engine/sessionStore'
import { ExportMenu } from '../export/ExportMenu'
import { RecordControls } from '../recorder/RecordControls'
import { useRecorderStore } from '../recorder/recorderStore'
import { setPresenting } from '../reveal/revealModel'
import { BlockMenu } from './BlockMenu'
import { PenMenu, ShapesMenu } from './ShapesMenu'
import { MAIN_TOOLS, TRAILING_TOOLS, type ToolDefinition } from './toolList'
import './topBar.css'

function ToolButton({ tool }: { tool: ToolDefinition }) {
  const isActive = useSessionStore((s) => s.tool === tool.id)
  return (
    <IconButton
      icon={tool.icon}
      label={tool.label}
      shortcut={tool.shortcut}
      isActive={isActive}
      onClick={() => toggleTool(tool.id)}
    />
  )
}

function ToolGroup() {
  const canUndo = useEngineStore((s) => s.past.length > 0)
  const undo = useEngineStore((s) => s.undo)

  return (
    <nav className="floating-bar" aria-label="Tools">
      {MAIN_TOOLS.map((tool) => (
        <ToolButton key={tool.id} tool={tool} />
      ))}
      <PenMenu />
      <ShapesMenu />
      <BlockMenu />
      {TRAILING_TOOLS.map((tool) => (
        <ToolButton key={tool.id} tool={tool} />
      ))}
      <span className="floating-bar__divider" />
      <IconButton
        icon={Undo2}
        label="Undo"
        shortcut="Ctrl Z"
        disabled={!canUndo}
        onClick={undo}
      />
    </nav>
  )
}

function SessionGroup() {
  const isPresenting = useSessionStore((s) => s.presenting)
  const isRecording = useRecorderStore((s) => s.status !== 'idle')
  const isCameraOn = useFacecamStore((s) => s.isEnabled)
  const toggleCamera = useFacecamStore((s) => s.toggleCamera)

  return (
    <div className="floating-bar">
      <IconButton
        icon={isCameraOn ? CameraOff : Camera}
        label={isCameraOn ? 'Turn off facecam' : 'Turn on facecam'}
        isActive={isCameraOn}
        onClick={toggleCamera}
      />
      <IconButton
        icon={Presentation}
        label={isPresenting ? 'Stop presenting' : 'Present'}
        shortcut="P"
        isActive={isPresenting}
        disabled={isRecording}
        onClick={() => setPresenting(!isPresenting)}
      />
      <ExportMenu disabled={isPresenting} />
      <RecordControls />
    </div>
  )
}

export function TopBar() {
  return (
    <header className="top-bar chrome">
      <ToolGroup />
      <SessionGroup />
    </header>
  )
}
