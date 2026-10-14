import type { TLStoreSnapshot } from 'tldraw'

export const PROJECT_FILE = 'project.json'
export const BOARD_FILE = 'board.json'
export const ASSETS_DIR = 'assets'
export const EXPORTS_DIR = 'exports'

const PROJECT_VERSION = 1

export type ProjectData = {
  version: typeof PROJECT_VERSION
  notes: Record<string, string>
}

export function createEmptyProject(): ProjectData {
  return { version: PROJECT_VERSION, notes: {} }
}

export function parseProject(text: string): ProjectData {
  const parsed: unknown = JSON.parse(text)
  if (typeof parsed !== 'object' || parsed === null) {
    throw new Error(`${PROJECT_FILE} is not a JSON object`)
  }
  const notes = (parsed as { notes?: unknown }).notes
  const safeNotes: Record<string, string> = {}
  if (typeof notes === 'object' && notes !== null) {
    for (const [pageId, text] of Object.entries(notes)) {
      if (typeof text === 'string') safeNotes[pageId] = text
    }
  }
  return { version: PROJECT_VERSION, notes: safeNotes }
}

export function parseBoard(text: string): TLStoreSnapshot {
  const parsed: unknown = JSON.parse(text)
  const looksLikeSnapshot =
    typeof parsed === 'object' &&
    parsed !== null &&
    'store' in parsed &&
    'schema' in parsed
  if (!looksLikeSnapshot) {
    throw new Error(`${BOARD_FILE} is not a tldraw board snapshot`)
  }
  return parsed as TLStoreSnapshot
}
