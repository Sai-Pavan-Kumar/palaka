import type { Editor, TLShape } from 'tldraw'
import { folderPathFromSrc } from '../project/folderAssetStore'

const TYPE_NAMES: Record<string, string> = {
  draw: 'Pen stroke',
  highlight: 'Highlight',
  geo: 'Shape',
  arrow: 'Arrow',
  line: 'Line',
  text: 'Text',
  image: 'Image',
  group: 'Group',
  frame: 'Frame',
  note: 'Sticky note',
}
const MAX_LABEL_LENGTH = 40

// A human label for the order list: the words on it, the image file name,
// or the kind of object.
export function describeShape(editor: Editor, shape: TLShape): string {
  const text = editor.getShapeUtil(shape).getText(shape)?.trim()
  if (text) return text.slice(0, MAX_LABEL_LENGTH)
  if (
    shape.type === 'image' &&
    'assetId' in shape.props &&
    shape.props.assetId
  ) {
    const src = editor.getAsset(shape.props.assetId)?.props.src
    const path = src ? folderPathFromSrc(src) : null
    if (path) return path.split('/').pop() ?? 'Image'
  }
  if (shape.type === 'geo' && 'geo' in shape.props) {
    const geo = String(shape.props.geo)
    return geo.charAt(0).toUpperCase() + geo.slice(1)
  }
  return TYPE_NAMES[shape.type] ?? 'Object'
}
