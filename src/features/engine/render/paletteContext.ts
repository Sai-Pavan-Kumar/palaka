import { createContext, useContext } from 'react'
import { DEFAULT_PAPER, getPalette, type BoardPalette } from '../model/paper'

// The ink colours depend on the paper (dark paper flips black ink to white).
// PageSvg provides the palette once; every shape view reads it from here, so
// the live board and the exports always agree.
export const BoardPaletteContext = createContext<BoardPalette>(
  getPalette(DEFAULT_PAPER),
)

export function useBoardPalette(): BoardPalette {
  return useContext(BoardPaletteContext)
}
