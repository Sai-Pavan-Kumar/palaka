import { DEFAULT_THEME, type TLThemes } from 'tldraw'

// tldraw's theme takes plain strings, so this mirrors --color-surface-card-light.
// The board must stay fully opaque: Element Capture turns transparency black.
const BOARD_BACKGROUND = '#ffffff'

// Same stacks as --font-brand / --font-code in tokens.css (SurfBoard-Typography.md).
const BRAND_STACK =
  "'Overused Grotesk', system-ui, 'Segoe UI', Arial, sans-serif"
const CODE_STACK =
  "'Geist Mono', ui-monospace, 'Cascadia Mono', Consolas, monospace"

const BRAND_FACE = {
  family: 'Overused Grotesk',
  src: { url: '/fonts/OverusedGrotesk-VF.woff2', format: 'woff2' },
  weight: '300 900',
}
const CODE_FACE = {
  family: 'Geist Mono',
  src: { url: '/fonts/GeistMono-latin.woff2', format: 'woff2' },
  weight: '100 900',
}

// "draw" is tldraw's default text style, so it gets the brand font too; the
// board speaks in one voice. "mono" is for code snippets and, later, SQL tables.
export const BOARD_THEMES: Partial<TLThemes> = {
  default: {
    ...DEFAULT_THEME,
    fonts: {
      ...DEFAULT_THEME.fonts,
      draw: { fontFamily: BRAND_STACK, faces: [BRAND_FACE] },
      sans: { fontFamily: BRAND_STACK, faces: [BRAND_FACE] },
      mono: { fontFamily: CODE_STACK, faces: [CODE_FACE] },
    },
    colors: {
      ...DEFAULT_THEME.colors,
      light: { ...DEFAULT_THEME.colors.light, background: BOARD_BACKGROUND },
    },
  },
}
