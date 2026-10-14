import { getDirectory, timestampForFileName } from '../../shared/fileSystem'
import { EXPORTS_DIR } from '../project/projectFiles'
import { useProjectStore } from '../project/projectStore'

// Where a recording's chunks go while recording. `finish` returns the whole
// video so the app can preview it and offer a download either way.
export type TakeWriter = {
  fileName: string
  savedPath: string | null
  write: (chunk: Blob) => Promise<void>
  finish: () => Promise<Blob>
  discard: () => Promise<void>
}

async function openFolderWriter(
  root: FileSystemDirectoryHandle,
  fileName: string,
): Promise<TakeWriter> {
  const exportsDir = await getDirectory(root, EXPORTS_DIR, { create: true })
  const handle = await exportsDir!.getFileHandle(fileName, { create: true })
  const writable = await handle.createWritable()
  return {
    fileName,
    savedPath: `${EXPORTS_DIR}/${fileName}`,
    write: (chunk) => writable.write(chunk),
    finish: async () => {
      await writable.close()
      return handle.getFile()
    },
    discard: () => writable.abort(),
  }
}

// No folder: keep chunks in memory. Fine for normal takes; very long takes
// should be recorded with a folder open.
function openMemoryWriter(fileName: string, mimeType: string): TakeWriter {
  let chunks: Blob[] = []
  return {
    fileName,
    savedPath: null,
    write: async (chunk) => {
      chunks.push(chunk)
    },
    finish: async () => new Blob(chunks, { type: mimeType }),
    discard: async () => {
      chunks = []
    },
  }
}

export async function openTakeWriter(
  extension: string,
  mimeType: string,
): Promise<TakeWriter> {
  const fileName = `recording-${timestampForFileName()}.${extension}`
  const root = useProjectStore.getState().project?.root
  return root
    ? openFolderWriter(root, fileName)
    : openMemoryWriter(fileName, mimeType)
}
