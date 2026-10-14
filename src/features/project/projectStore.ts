import type { Editor, TLStoreSnapshot } from 'tldraw'
import { create } from 'zustand'
import type { FolderFile } from '../../shared/fileSystem'

export type SaveStatus = 'saved' | 'saving' | 'error'

export type OpenProject = {
  root: FileSystemDirectoryHandle
  folderName: string
  assets: FolderFile[]
  // Read once when the folder opens, then handed to the editor.
  legacyNotes: Record<string, string>
  initialBoard: TLStoreSnapshot | null
  // The exact editor this folder was loaded into. Autosave only ever writes
  // that editor's content, so a restarted (empty) board can never overwrite it.
  boundEditor?: Editor
}

type ProjectState = {
  project: OpenProject | null
  loadError: string | null
  saveStatus: SaveStatus
  setProject: (project: OpenProject) => void
  setLoadError: (message: string | null) => void
  setAssets: (assets: FolderFile[]) => void
  setSaveStatus: (status: SaveStatus) => void
  closeProject: () => void
}

export const useProjectStore = create<ProjectState>((set) => ({
  project: null,
  loadError: null,
  saveStatus: 'saved',
  setProject: (project) =>
    set({ project, loadError: null, saveStatus: 'saved' }),
  setLoadError: (loadError) => set({ loadError }),
  setAssets: (assets) =>
    set((state) =>
      state.project ? { project: { ...state.project, assets } } : state,
    ),
  setSaveStatus: (saveStatus) => set({ saveStatus }),
  closeProject: () => set({ project: null, saveStatus: 'saved' }),
}))

export function getProjectRoot(): FileSystemDirectoryHandle {
  const root = useProjectStore.getState().project?.root
  if (!root) throw new Error('No project folder is open.')
  return root
}
