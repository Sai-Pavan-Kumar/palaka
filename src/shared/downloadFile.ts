// Used when no folder is open: hand the file to the browser's normal download.
export function downloadFile(
  name: string,
  data: Blob | string | BufferSource,
): void {
  const blob = data instanceof Blob ? data : new Blob([data])
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = name
  link.click()
  // Give the browser time to start the download before freeing the memory.
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
}
