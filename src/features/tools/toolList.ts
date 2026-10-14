import {
  ArrowUpRight,
  Circle,
  Diamond,
  Highlighter,
  Pointer,
  Eraser,
  Minus,
  MousePointer2,
  PenLine,
  Square,
  Triangle,
  Type,
  type LucideIcon,
} from 'lucide-react'
import { GeoShapeGeoStyle, type Editor } from 'tldraw'

export type ToolDefinition = {
  id: string
  label: string
  shortcut: string
  icon: LucideIcon
  select: (editor: Editor) => void
  isActive: (toolId: string, editor: Editor) => boolean
}

const simpleTool = (
  id: string,
  label: string,
  shortcut: string,
  icon: LucideIcon,
): ToolDefinition => ({
  id,
  label,
  shortcut,
  icon,
  select: (editor) => editor.setCurrentTool(id),
  isActive: (toolId) => toolId === id,
})

const geoTool = (
  geo: 'rectangle' | 'ellipse' | 'triangle' | 'diamond',
  label: string,
  shortcut: string,
  icon: LucideIcon,
): ToolDefinition => ({
  id: geo,
  label,
  shortcut,
  icon,
  select: (editor) => {
    editor.setStyleForNextShapes(GeoShapeGeoStyle, geo)
    editor.setCurrentTool('geo')
  },
  isActive: (toolId, editor) =>
    toolId === 'geo' && editor.getStyleForNextShape(GeoShapeGeoStyle) === geo,
})

// Shortcuts match tldraw's own keys, so nothing new to learn.
export const MAIN_TOOLS: ToolDefinition[] = [
  simpleTool('select', 'Select', 'V', MousePointer2),
]

// The laser leaves a fading trail inside the board, so it shows in the video:
// the natural way to point at things while explaining.
export const PEN_TOOLS: ToolDefinition[] = [
  simpleTool('draw', 'Pen', 'D', PenLine),
  simpleTool('highlight', 'Highlighter', 'Shift D', Highlighter),
  simpleTool('laser', 'Laser pointer', 'K', Pointer),
]

export const SHAPE_TOOLS: ToolDefinition[] = [
  geoTool('rectangle', 'Rectangle', 'R', Square),
  geoTool('ellipse', 'Ellipse', 'O', Circle),
  geoTool('triangle', 'Triangle', '', Triangle),
  geoTool('diamond', 'Diamond', '', Diamond),
  simpleTool('line', 'Line', 'L', Minus),
]

export const TRAILING_TOOLS: ToolDefinition[] = [
  simpleTool('arrow', 'Arrow', 'A', ArrowUpRight),
  simpleTool('text', 'Text', 'T', Type),
  simpleTool('eraser', 'Eraser', 'E', Eraser),
]
