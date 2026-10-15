// One pointer sample, already converted to board units.
export type BoardPointer = {
  x: number
  y: number
  pressure: number
  isPen: boolean
  shiftKey: boolean
  // Alt keeps a new line or arrow from sticking to shapes.
  altKey: boolean
  // Board units per screen pixel. Lets tools think in screen pixels
  // ("grab within 8 px") whatever size the board is shown at.
  unitsPerPixel: number
}

// A gesture runs from pointer down to pointer up. `move` gets every sample
// the browser coalesced since the last event, so fast pen strokes stay smooth.
export type ToolGesture = {
  move: (samples: BoardPointer[]) => void
  end: () => void
}

export type ToolHandler = {
  start: (pointer: BoardPointer) => ToolGesture
}
