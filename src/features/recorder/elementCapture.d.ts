// Element Capture (Chrome 132+ desktop) is not in TypeScript's DOM lib yet.
// Shapes follow https://developer.chrome.com/docs/web-platform/element-capture

declare class RestrictionTarget {
  static fromElement(element: Element): Promise<RestrictionTarget>
}

interface MediaStreamTrack {
  restrictTo(target: RestrictionTarget | null): Promise<void>
}

// TypeScript only lists this on getUserMedia constraints, but Chrome reads it
// from getDisplayMedia to pre-select the current tab in the share picker.
interface DisplayMediaStreamOptions {
  preferCurrentTab?: boolean
}
