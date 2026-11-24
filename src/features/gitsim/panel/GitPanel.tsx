import { useSessionStore } from '../../engine/sessionStore'
import { useNotesStore } from '../../notes/pageNotes'
import { useUiStore } from '../../shell/uiStore'
import { startGitSim, useGitSimStore } from '../gitSimStore'
import { GIT_TEMPLATES } from '../templates'

// The panel sits over the board, so a run moves it out of the way (as SQL
// insert does) and says once how to drive the run from the floating bar.
function runAndReveal(script: string): void {
  startGitSim(script)
  const total = useGitSimStore.getState().steps.length - 1
  const ui = useUiStore.getState()
  useUiStore.setState({ isLeftPanelOpen: false })
  ui.showToast(
    `${total} commands ready. Space = next, Shift+Space = back, Esc or Delete = clear.`,
    'info',
  )
}

export function GitPanel() {
  const pageId = useSessionStore((s) => s.pageId)
  const script = useNotesStore((s) => s.git[pageId] ?? '')
  const setGit = useNotesStore((s) => s.setGit)
  const isRunning = useGitSimStore((s) => s.steps.length > 0)
  return (
    <div className="sql-panel code-panel">
      <div className="code-panel__chips" aria-label="Templates">
        {GIT_TEMPLATES.map((template) => (
          <button
            key={template.id}
            type="button"
            // Lit only while the box still holds this lesson unchanged, so
            // an edited script never pretends to be a template.
            className={`sql-panel__chip ${script === template.script ? 'is-active' : ''}`}
            aria-pressed={script === template.script}
            onClick={() => setGit(pageId, template.script)}
          >
            {template.label}
          </button>
        ))}
      </div>
      <textarea
        className="sql-panel__input"
        value={script}
        spellCheck={false}
        aria-label="Git commands, one per line"
        placeholder={
          'git init\necho "hi" > a.txt\ngit add .\ngit commit -m "First"'
        }
        onChange={(event) => setGit(pageId, event.target.value)}
      />
      <p className="code-panel__note">
        One command per line. touch, echo "text" &gt; file and rm change files.
        Space steps, Shift+Space goes back, Esc or Delete clears the board.
      </p>
      <div className="sql-panel__actions">
        <button
          type="button"
          className="sql-panel__insert"
          disabled={script.trim() === ''}
          onClick={() => runAndReveal(script)}
        >
          {isRunning ? 'Restart on board' : 'Run on board'}
        </button>
      </div>
    </div>
  )
}
