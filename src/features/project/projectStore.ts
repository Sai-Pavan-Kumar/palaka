import { create } from 'zustand'
import type { FolderFile } from '../../shared/fileSystem'

export type SaveStatus = 'saved' | 'saving' | 'error'

export type OpenProject = {
  root: FileSystemDirectoryHandle
  folderName: string
  assets: FolderFile[]
  // The board session this folder was loaded into. Autosave only writes when
  // the running board is that same session, so a restarted (empty) board can
  // never overwrite the folder's board.
  boundSessionId: string
}

type ProjectState = {
  project: OpenProject | null
  saveStatus: SaveStatus
  setProject: (project: OpenProject) => void
  setAssets: (assets: FolderFile[]) => void
  setSaveStatus: (status: SaveStatus) => void
  closeProject: () => void
}

export const useProjectStore = create<ProjectState>((set) => ({
  project: null,
  saveStatus: 'saved',
  setProject: (project) => set({ project, saveStatus: 'saved' }),
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
