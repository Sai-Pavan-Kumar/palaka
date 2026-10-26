// Copies the Pyodide core runtime into public/pyodide so the app serves it
// from its own origin: no CDN, and the strict CSP only has to trust 'self'.
// The folder is git-ignored (~13 MB); predev and prebuild recreate it.
import { copyFileSync, existsSync, mkdirSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const source = join(root, 'node_modules', 'pyodide')
const target = join(root, 'public', 'pyodide')

// Only the core: extra packages (numpy etc.) are never loaded.
const CORE_FILES = [
  'pyodide.mjs',
  'pyodide.asm.mjs',
  'pyodide.asm.wasm',
  'python_stdlib.zip',
  'pyodide-lock.json',
]

// Cloudflare static assets refuse files over 25 MiB.
const MAX_ASSET_BYTES = 25 * 1024 * 1024

mkdirSync(target, { recursive: true })
for (const file of CORE_FILES) {
  const from = join(source, file)
  if (!existsSync(from)) {
    throw new Error(`Pyodide file missing: ${from}. Run npm install.`)
  }
  if (statSync(from).size > MAX_ASSET_BYTES) {
    throw new Error(`${file} is over the 25 MiB Cloudflare asset limit.`)
  }
  copyFileSync(from, join(target, file))
}
console.log(`Pyodide core copied to ${target}`)
