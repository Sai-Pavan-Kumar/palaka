import './topBar.css'

// Placeholder tools for the layout. The open menu hangs over the board on
// purpose: it is the leak test that proves popovers never reach the video.
const TOOL_LABELS = ['Select', 'Draw', 'Shapes', 'Arrow', 'Text', 'Eraser']

export function TopBar() {
  return (
    <header className="top-bar">
      <nav className="top-bar__tools" aria-label="Tools">
        {TOOL_LABELS.map((label, index) => (
          <button
            key={label}
            type="button"
            className={`top-bar__tool ${index === 1 ? 'is-active' : ''}`}
          >
            {label}
          </button>
        ))}
      </nav>
      <div className="top-bar__leak-menu" role="note">
        Leak test menu. If you can see this in the recording, capture is broken.
      </div>
    </header>
  )
}
