import { createElement } from 'react'
import { useEngineStore } from '../engine/engineStore'
import { SLIDE_SIZE } from '../engine/model/boardSpec'
import type { BoardDocument, Page } from '../engine/model/types'
import { PageSvg } from '../engine/render/PageSvg'
import {
  readAsDataUrl,
  resolveAssetAsDataUrl,
} from '../project/folderAssetStore'

export type RenderedPage = { name: string; png: Blob }

// Same files fonts.css serves to the app. An SVG drawn into a canvas cannot
// fetch anything, so the fonts travel inside it as data URLs.
const EMBEDDED_FONTS = [
  {
    family: 'Overused Grotesk',
    url: '/fonts/OverusedGrotesk-VF.woff2',
    weight: '300 900',
  },
  {
    family: 'Geist Mono',
    url: '/fonts/GeistMono-latin.woff2',
    weight: '100 900',
  },
]
let fontCssPromise: Promise<string> | null = null

function getEmbeddedFontCss(): Promise<string> {
  fontCssPromise ??= Promise.all(
    EMBEDDED_FONTS.map(async ({ family, url, weight }) => {
      const dataUrl = await readAsDataUrl(await (await fetch(url)).blob())
      return `@font-face{font-family:'${family}';src:url(${dataUrl}) format('woff2');font-weight:${weight};}`
    }),
  ).then((rules) => rules.join(''))
  return fontCssPromise
}

async function getImageDataUrls(doc: BoardDocument, pages: Page[]) {
  const usedIds = new Set(
    pages.flatMap((page) =>
      Object.values(page.shapes).flatMap((s) =>
        s.type === 'image' ? [s.assetId] : [],
      ),
    ),
  )
  const entries = await Promise.all(
    [...usedIds]
      .filter((id) => doc.assets[id])
      .map(
        async (id) =>
          [id, await resolveAssetAsDataUrl(doc.assets[id].src)] as const,
      ),
  )
  return Object.fromEntries(entries)
}

async function svgToPng(
  svg: string,
  width: number,
  height: number,
): Promise<Blob> {
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }))
  try {
    const image = new Image()
    image.src = url
    await image.decode()
    const canvas = new OffscreenCanvas(width, height)
    canvas.getContext('2d')!.drawImage(image, 0, 0, width, height)
    return await canvas.convertToBlob({ type: 'image/png' })
  } finally {
    URL.revokeObjectURL(url)
  }
}

// Always the full slide, never "fit to content", so every page and the video
// share one frame. Every shape is drawn: reveal steps do not apply to exports.
export async function renderPages(pageIds: string[]): Promise<RenderedPage[]> {
  const { doc } = useEngineStore.getState()
  const pages = pageIds
    .map((id) => doc.pages.find((page) => page.id === id))
    .filter((page) => page !== undefined)
  const { width, height } = SLIDE_SIZE[doc.aspect]
  const [{ renderToStaticMarkup }, fontCss, imageUrls] = await Promise.all([
    import('react-dom/server'),
    getEmbeddedFontCss(),
    getImageDataUrls(doc, pages),
  ])
  const rendered: RenderedPage[] = []
  for (const page of pages) {
    const svg = renderToStaticMarkup(
      createElement(
        PageSvg,
        {
          page,
          aspect: doc.aspect,
          paper: doc.paper,
          imageUrls,
          includeSpotlight: false,
        },
        createElement('style', null, fontCss),
      ),
    )
    rendered.push({ name: page.name, png: await svgToPng(svg, width, height) })
  }
  return rendered
}
