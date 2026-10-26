import { useEffect } from 'react'
import { loadIconLibrary, useIconLibrary } from './iconLibrary'

// The library icon a block wears, or null while the packs load (the block
// then shows its kind's line icon, so nothing pops or jumps).
export function useLibraryIcon(id: string | undefined) {
  const icon = useIconLibrary((s) => (id ? s.byId?.get(id) : undefined))
  const isLoaded = useIconLibrary((s) => s.byId !== null)
  useEffect(() => {
    if (id && !isLoaded) void loadIconLibrary()
  }, [id, isLoaded])
  return icon ?? null
}
