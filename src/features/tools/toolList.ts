import {
  ArrowUpRight,
  Circle,
  Diamond,
  Eraser,
  Heart,
  Highlighter,
  Minus,
  MousePointer2,
  PenLine,
  Pointer,
  Square,
  Triangle,
  Type,
  type LucideIcon,
} from 'lucide-react'
import type { EngineTool } from '../engine/sessionStore'

export type ToolDefinition = {
  id: EngineTool
  label: string
  shortcut: string
  icon: LucideIcon
}

// Shortcuts match the old tldraw build, so nothing new to learn.
export const MAIN_TOOLS: ToolDefinition[] = [
  { id: 'select', label: 'Select', shortcut: 'V', icon: MousePointer2 },
]

// The laser leaves a fading trail inside the board, so it shows in the video:
// the natural way to point at things while explaining.
export const PEN_TOOLS: ToolDefinition[] = [
  { id: 'pen', label: 'Pen', shortcut: 'D', icon: PenLine },
  {
    id: 'highlighter',
    label: 'Highlighter',
    shortcut: 'Shift D',
    icon: Highlighter,
  },
  { id: 'laser', label: 'Laser pointer', shortcut: 'K', icon: Pointer },
]

export const SHAPE_TOOLS: ToolDefinition[] = [
  { id: 'rectangle', label: 'Rectangle', shortcut: 'R', icon: Square },
  { id: 'ellipse', label: 'Ellipse', shortcut: 'O', icon: Circle },
  { id: 'triangle', label: 'Triangle', shortcut: '', icon: Triangle },
  { id: 'diamond', label: 'Diamond', shortcut: '', icon: Diamond },
  { id: 'heart', label: 'Heart', shortcut: '', icon: Heart },
  { id: 'line', label: 'Line', shortcut: 'L', icon: Minus },
]

export const TRAILING_TOOLS: ToolDefinition[] = [
  { id: 'arrow', label: 'Arrow', shortcut: 'A', icon: ArrowUpRight },
  { id: 'text', label: 'Text', shortcut: 'T', icon: Type },
  { id: 'eraser', label: 'Eraser', shortcut: 'E', icon: Eraser },
]

const SINGLE_KEY_TOOLS: Record<string, EngineTool> = {
  v: 'select',
  d: 'pen',
  k: 'laser',
  r: 'rectangle',
  o: 'ellipse',
  l: 'line',
  a: 'arrow',
  t: 'text',
  e: 'eraser',
  b: 'block',
}

export function toolForKey(key: string, shiftKey: boolean): EngineTool | null {
  if (key === 'd' && shiftKey) return 'highlighter'
  return shiftKey ? null : (SINGLE_KEY_TOOLS[key] ?? null)
}
