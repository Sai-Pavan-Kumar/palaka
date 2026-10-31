import {
  getDirectory,
  timestampForFileName,
  writeFile,
} from '../../shared/fileSystem'
import { useEngineStore } from '../engine/engineStore'
import { useSessionStore } from '../engine/sessionStore'
import { currentBoardText } from '../project/boardPersistence'
import { resolveAssetAsDataUrl } from '../project/folderAssetStore'
import {
  EXPORTS_DIR,
  parseBoard,
  serializeBoard,
} from '../project/projectFiles'
import { downloadFile } from '../../shared/downloadFile'
import { useProjectStore } from '../project/projectStore'
import { renderPages, type RenderedPage } from './renderPages'

function slug(text: string): string {
  return (
    text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'page'
  )
}

function numbered(
  page: RenderedPage,
  index: number,
  extension: string,
): string {
  return `${String(index + 1).padStart(2, '0')}-${slug(page.name)}.${extension}`
}

// Into <folder>/exports/ when a folder is open, otherwise a normal download.
// Returns where the file went, for the confirmation toast.
async function saveToExports(
  name: string,
  data: Blob | string | BufferSource,
): Promise<string> {
  const root = useProjectStore.getState().project?.root
  if (!root) {
    downloadFile(name, data)
    return `${name} (Downloads)`
  }
  const exportsDir = await getDirectory(root, EXPORTS_DIR, { create: true })
  await writeFile(exportsDir!, name, data)
  return `${EXPORTS_DIR}/${name}`
}

const allPageIds = () =>
  useEngineStore.getState().doc.pages.map((page) => page.id)
const currentPageId = () => useSessionStore.getState().pageId

export async function exportCurrentPagePng(): Promise<string> {
  const [page] = await renderPages([currentPageId()])
  const index = allPageIds().indexOf(currentPageId())
  return saveToExports(numbered(page, index, 'png'), page.png)
}

// fflate and pdf-lib load only here, so they never slow the first paint.
export async function exportAllPagesZip(): Promise<string> {
  const [{ zipSync }, pages] = await Promise.all([
    import('fflate'),
    renderPages(allPageIds()),
  ])
  const entries: Record<string, Uint8Array> = {}
  for (const [index, page] of pages.entries()) {
    entries[numbered(page, index, 'png')] = new Uint8Array(
      await page.png.arrayBuffer(),
    )
  }
  // PNGs are already compressed; level 0 just packs them, which is much faster.
  // fflate and pdf-lib allocate plain ArrayBuffers; their typings just say "maybe shared".
  const zip = zipSync(entries, { level: 0 }) as Uint8Array<ArrayBuffer>
  return saveToExports(`pages-${timestampForFileName()}.zip`, zip)
}

async function buildPdf(
  pages: RenderedPage[],
): Promise<Uint8Array<ArrayBuffer>> {
  const { PDFDocument } = await import('pdf-lib')
  const pdf = await PDFDocument.create()
  for (const page of pages) {
    const image = await pdf.embedPng(await page.png.arrayBuffer())
    pdf.addPage([page.width, page.height]).drawImage(image, {
      x: 0,
      y: 0,
      width: page.width,
      height: page.height,
    })
  }
  return (await pdf.save()) as Uint8Array<ArrayBuffer>
}

export async function exportAllPagesPdf(): Promise<string> {
  const pages = await renderPages(allPageIds())
  return saveToExports(
    `pages-${timestampForFileName()}.pdf`,
    await buildPdf(pages),
  )
}

// Folder images become data URLs so the downloaded file works on its own,
// away from the folder it came from.
export async function exportBoardFile(): Promise<string> {
  const board = parseBoard(currentBoardText())
  const assets = Object.fromEntries(
    await Promise.all(
      Object.entries(board.document.assets).map(async ([id, asset]) => [
        id,
        { ...asset, src: await resolveAssetAsDataUrl(asset.src) },
      ]),
    ),
  )
  const text = serializeBoard(
    { ...board.document, assets },
    board.notes,
    board.sql,
  )
  return saveToExports(`board-${timestampForFileName()}.json`, text)
}

export async function exportCurrentPagePdf(): Promise<string> {
  const pages = await renderPages([currentPageId()])
  const index = allPageIds().indexOf(currentPageId())
  return saveToExports(numbered(pages[0], index, 'pdf'), await buildPdf(pages))
}
