import { normalizeBlockKinds } from '../engine/model/blockCatalog'
import { dropBrokenBindings } from '../engine/model/connectors'
import { normalizePaper } from '../engine/model/paper'
import type { BoardDocument, Page } from '../engine/model/types'

export const BOARD_FILE = 'board.json'
export const ASSETS_DIR = 'assets'
export const EXPORTS_DIR = 'exports'

const APP_ID = 'palaka'
const FILE_VERSION = 2

export type BoardFile = {
  app: typeof APP_ID
  version: typeof FILE_VERSION
  document: BoardDocument
  notes: Record<string, string>
  // Optional: boards saved before SQL tables existed have none.
  sql?: Record<string, string>
}

// Boards from the tldraw build cannot be read by this engine. The owner chose
// to start fresh, so such a folder is refused instead of being overwritten.
export class LegacyBoardError extends Error {
  constructor() {
    super(
      'This folder has a board from the old Palaka (tldraw) version. It was left untouched. Pick another folder, or move its board.json away first.',
    )
    this.name = 'LegacyBoardError'
  }
}

export function serializeBoard(
  document: BoardDocument,
  notes: Record<string, string>,
  sql: Record<string, string> = {},
): string {
  const file: BoardFile = {
    app: APP_ID,
    version: FILE_VERSION,
    document,
    notes,
    sql,
  }
  return JSON.stringify(file)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isValidPage(value: unknown): value is Page {
  if (!isRecord(value) || !isRecord(value.shapes)) return false
  if (typeof value.id !== 'string' || !Array.isArray(value.order)) return false
  const shapes = value.shapes
  return value.order.every(
    (id) => typeof id === 'string' && isRecord(shapes[id]),
  )
}

function isValidDocument(value: unknown): value is BoardDocument {
  return (
    isRecord(value) &&
    (value.aspect === '16:9' || value.aspect === '9:16') &&
    isRecord(value.assets) &&
    Array.isArray(value.pages) &&
    value.pages.length > 0 &&
    value.pages.every(isValidPage)
  )
}

function stringRecord(value: unknown): Record<string, string> {
  if (!isRecord(value)) return {}
  return Object.fromEntries(
    Object.entries(value).filter(([, text]) => typeof text === 'string'),
  ) as Record<string, string>
}

// Throws on anything it does not fully understand, so a damaged or foreign
// file is never loaded and then overwritten by autosave.
export function parseBoard(text: string): BoardFile {
  const parsed: unknown = JSON.parse(text)
  if (!isRecord(parsed)) throw new Error(`${BOARD_FILE} is not a JSON object`)
  if ('store' in parsed && 'schema' in parsed) throw new LegacyBoardError()
  if (parsed.app !== APP_ID || parsed.version !== FILE_VERSION) {
    throw new Error(`${BOARD_FILE} is not a Palaka board this version can read`)
  }
  if (!isValidDocument(parsed.document)) {
    throw new Error(`${BOARD_FILE} is damaged, so nothing was loaded`)
  }
  const safeNotes = stringRecord(parsed.notes)
  return {
    app: APP_ID,
    version: FILE_VERSION,
    // Boards saved before paper existed load with the default paper.
    document: {
      ...parsed.document,
      paper: normalizePaper(parsed.document.paper),
      pages: parsed.document.pages.map((page) =>
        dropBrokenBindings(normalizeBlockKinds(page)),
      ),
    },
    notes: safeNotes,
    sql: stringRecord(parsed.sql),
  }
}
