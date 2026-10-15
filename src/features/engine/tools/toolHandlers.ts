import type { EngineTool } from '../sessionStore'
import { createDrawTool } from './drawTool'
import { eraserTool } from './eraserTool'
import { selectTool } from './selectTool'
import { blockTool, createGeoTool, createLineTool } from './shapeTools'
import { laserTool, textTool } from './textAndLaserTools'
import type { ToolHandler } from './toolTypes'

export const TOOL_HANDLERS: Record<EngineTool, ToolHandler> = {
  select: selectTool,
  pen: createDrawTool('pen'),
  highlighter: createDrawTool('highlighter'),
  laser: laserTool,
  rectangle: createGeoTool('rectangle'),
  ellipse: createGeoTool('ellipse'),
  triangle: createGeoTool('triangle'),
  diamond: createGeoTool('diamond'),
  heart: createGeoTool('heart'),
  line: createLineTool(false),
  arrow: createLineTool(true),
  text: textTool,
  eraser: eraserTool,
  block: blockTool,
}
