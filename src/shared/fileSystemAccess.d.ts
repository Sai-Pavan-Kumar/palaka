// File System Access picker (Chrome/Edge desktop) is not in TypeScript's DOM lib.
// Shape follows https://developer.mozilla.org/docs/Web/API/Window/showDirectoryPicker

interface DirectoryPickerOptions {
  id?: string
  mode?: 'read' | 'readwrite'
  startIn?: 'desktop' | 'documents' | 'downloads' | 'pictures' | 'videos'
}

interface Window {
  showDirectoryPicker?: (
    options?: DirectoryPickerOptions,
  ) => Promise<FileSystemDirectoryHandle>
}
