import type { BoardDocument, Shape } from '../engine/model/types'

const MAX_LABEL_LENGTH = 40

function capitalize(word: string): string {
  return word.charAt(0).toUpperCase() + word.slice(1)
}

// A human label for the order list: the words on it, the image file name,
// or the kind of object.
export function describeShape(doc: BoardDocument, shape: Shape): string {
  switch (shape.type) {
    case 'text':
      return shape.text.trim().slice(0, MAX_LABEL_LENGTH) || 'Text'
    case 'image':
      return doc.assets[shape.assetId]?.name || 'Image'
    case 'geo':
      return capitalize(shape.geo)
    case 'line':
      return shape.arrowhead ? 'Arrow' : 'Line'
    case 'stroke':
      return shape.kind === 'highlighter' ? 'Highlight' : 'Pen stroke'
  }
}
