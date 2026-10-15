import { BLOCK_NAMES } from '../engine/model/blockCatalog'
import type {
  BoardDocument,
  HighlightShape,
  Shape,
} from '../engine/model/types'

const MAX_LABEL_LENGTH = 40

function capitalize(word: string): string {
  return word.charAt(0).toUpperCase() + word.slice(1)
}

function describeTargets(doc: BoardDocument, shape: HighlightShape): string {
  const tables = new Map<string, string>()
  for (const page of doc.pages) {
    for (const s of Object.values(page.shapes)) {
      if (s.type === 'table') tables.set(s.id, s.name)
    }
  }
  return shape.targets
    .map((t) => `${tables.get(t.tableId) ?? '?'}.${t.column}`)
    .join(' → ')
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
    case 'tableState':
      return shape.label
    case 'highlight':
      return `Highlight: ${describeTargets(doc, shape)}`
    case 'table':
      return `Table: ${shape.name}`
    case 'block':
      return (
        shape.label.trim().slice(0, MAX_LABEL_LENGTH) || BLOCK_NAMES[shape.kind]
      )
    case 'line': {
      const kind = shape.arrowhead ? 'Arrow' : 'Line'
      const label = shape.label?.trim()
      return label ? `${kind}: ${label.slice(0, MAX_LABEL_LENGTH)}` : kind
    }
    case 'stroke':
      return shape.kind === 'highlighter' ? 'Highlight' : 'Pen stroke'
  }
}
