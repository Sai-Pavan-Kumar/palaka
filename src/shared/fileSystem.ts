const IMAGE_EXTENSIONS = new Set(['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg'])

export type FolderFile = {
  path: string
  name: string
  handle: FileSystemFileHandle
}

export function isImageFileName(name: string): boolean {
  const extension = name.split('.').pop()?.toLowerCase() ?? ''
  return IMAGE_EXTENSIONS.has(extension)
}

function isNotFound(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'NotFoundError'
}

export async function getDirectory(
  parent: FileSystemDirectoryHandle,
  name: string,
  { create }: { create: boolean },
): Promise<FileSystemDirectoryHandle | null> {
  try {
    return await parent.getDirectoryHandle(name, { create })
  } catch (error) {
    if (isNotFound(error)) return null
    throw error
  }
}

export async function readTextFile(
  directory: FileSystemDirectoryHandle,
  name: string,
): Promise<string | null> {
  try {
    const handle = await directory.getFileHandle(name)
    return await (await handle.getFile()).text()
  } catch (error) {
    if (isNotFound(error)) return null
    throw error
  }
}

// createWritable writes to a temporary swap file and only replaces the real
// file on close, so a crash mid-save never leaves a half-written project.
export async function writeFile(
  directory: FileSystemDirectoryHandle,
  name: string,
  data: Blob | string | BufferSource,
): Promise<void> {
  const handle = await directory.getFileHandle(name, { create: true })
  const writable = await handle.createWritable()
  await writable.write(data)
  await writable.close()
}

export async function listImageFiles(
  directory: FileSystemDirectoryHandle,
  pathPrefix = '',
): Promise<FolderFile[]> {
  const files: FolderFile[] = []
  for await (const entry of directory.values()) {
    if (entry.kind === 'file' && isImageFileName(entry.name)) {
      files.push({
        path: pathPrefix + entry.name,
        name: entry.name,
        handle: entry,
      })
    }
  }
  // Numeric sort so "2-intro.png" comes before "10-outro.png".
  return files.sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { numeric: true }),
  )
}

export async function getFileAtPath(
  root: FileSystemDirectoryHandle,
  path: string,
): Promise<File> {
  const parts = path.split('/')
  const fileName = parts.pop() ?? ''
  let directory = root
  for (const part of parts) {
    directory = await directory.getDirectoryHandle(part)
  }
  return (await directory.getFileHandle(fileName)).getFile()
}

export async function makeUniqueFileName(
  directory: FileSystemDirectoryHandle,
  desiredName: string,
): Promise<string> {
  const dotIndex = desiredName.lastIndexOf('.')
  const base = dotIndex > 0 ? desiredName.slice(0, dotIndex) : desiredName
  const extension = dotIndex > 0 ? desiredName.slice(dotIndex) : ''
  for (let attempt = 0; ; attempt++) {
    const candidate =
      attempt === 0 ? desiredName : `${base}-${attempt}${extension}`
    try {
      await directory.getFileHandle(candidate)
    } catch (error) {
      if (isNotFound(error)) return candidate
      throw error
    }
  }
}

export function timestampForFileName(date = new Date()): string {
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`
}
