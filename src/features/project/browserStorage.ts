// The board's home when no folder is open. IndexedDB (not localStorage)
// because boards with pasted images easily pass localStorage's ~5 MB cap.
// A new database name on purpose: the old tldraw copy is left untouched.
const DB_NAME = 'palaka'
const STORE_NAME = 'boards'
const BOARD_KEY = 'board'

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1)
    request.onupgradeneeded = () => request.result.createObjectStore(STORE_NAME)
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

async function run<T>(
  mode: IDBTransactionMode,
  action: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await openDatabase()
  try {
    return await new Promise<T>((resolve, reject) => {
      const request = action(
        db.transaction(STORE_NAME, mode).objectStore(STORE_NAME),
      )
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  } finally {
    db.close()
  }
}

export function readBrowserBoard(): Promise<string | undefined> {
  return run<string | undefined>('readonly', (store) => store.get(BOARD_KEY))
}

export async function writeBrowserBoard(text: string): Promise<void> {
  await run('readwrite', (store) => store.put(text, BOARD_KEY))
}

// A copy that could not be read is parked under its own key instead of
// being overwritten, so nothing is ever silently lost.
export async function parkUnreadableBoard(text: string): Promise<void> {
  await run('readwrite', (store) => store.put(text, `unreadable-${Date.now()}`))
}
