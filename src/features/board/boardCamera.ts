import { Box, type TLCameraOptions } from 'tldraw'

// Every page is one fixed 1080p slide in page space. Recording, PNG and PDF
// exports all use these same bounds, so what you see is what you ship.
export const BOARD_WIDTH = 1920
export const BOARD_HEIGHT = 1080
export const BOARD_BOUNDS = new Box(0, 0, BOARD_WIDTH, BOARD_HEIGHT)

// Not `isLocked`: a locked camera skips tldraw's constraint pass, so it would
// never fit the slide. Instead one allowed zoom (the fit zoom) plus a "fixed"
// position pins the camera, and tldraw re-fits it whenever the window resizes.
export const BOARD_CAMERA_OPTIONS: Partial<TLCameraOptions> = {
  isLocked: false,
  wheelBehavior: 'none',
  panSpeed: 0,
  zoomSpeed: 0,
  zoomSteps: [1],
  constraints: {
    bounds: { x: 0, y: 0, w: BOARD_WIDTH, h: BOARD_HEIGHT },
    padding: { x: 0, y: 0 },
    origin: { x: 0.5, y: 0.5 },
    initialZoom: 'fit-max',
    baseZoom: 'fit-max',
    behavior: 'fixed',
  },
}
