import { useState, type KeyboardEvent } from 'react'
import { useEngineStore } from '../../engine/engineStore'
import type { CodePins } from '../../engine/model/types'
import { findPage } from '../../engine/model/documentOps'
import { useSessionStore } from '../../engine/sessionStore'
import { useUiStore } from '../../shell/uiStore'
import { useCodeSimStore, type CodeSimStatus } from '../codeSimStore'
import { findCodeCard, NO_PINS } from '../codeCard'
import { runOnBoard } from '../runOnBoard'
import { CODE_TEMPLATES } from '../templates'
import { PinFields } from './PinFields'
import { StepThroughSwitch } from './StepThroughSwitch'
import '../../sql/sqlPanel.css'
import './codePanel.css'

const INDENT = '    '

const RUN_LABEL: Record<CodeSimStatus, string> = {
  idle: 'Run on board',
  loading: 'Loading Python…',
  running: 'Running…',
  ready: 'Run again',
  error: 'Run again',
}

// The panel covers the card, so a good run moves it out of the way and the
// floating bar takes over. Loading and errors keep it open: their message
// lives here.
async function runAndReveal(
  source: string,
  call: string,
  pins: CodePins,
): Promise<void> {
  await runOnBoard(source, call, pins)
  const { status, steps } = useCodeSimStore.getState()
  if (status !== 'ready') return
  const ui = useUiStore.getState()
  useUiStore.setState({ isLeftPanelOpen: false })
  ui.showToast(
    `${steps.length} steps ready. Space = next, Shift+Space = back, Esc = stop.`,
    'info',
  )
}

// Tab in a code box should indent, like every editor, not jump focus away.
function indentOnTab(
  event: KeyboardEvent<HTMLTextAreaElement>,
  setSource: (next: string) => void,
) {
  if (event.key !== 'Tab' || event.shiftKey) return
  event.preventDefault()
  const box = event.currentTarget
  const { selectionStart: start, selectionEnd: end, value } = box
  setSource(value.slice(0, start) + INDENT + value.slice(end))
  requestAnimationFrame(() => {
    box.selectionStart = box.selectionEnd = start + INDENT.length
  })
}

function TemplateChips({
  current,
  onPick,
}: {
  current: string
  onPick: (source: string, call: string) => void
}) {
  return (
    <div className="code-panel__chips" aria-label="Templates">
      {CODE_TEMPLATES.map((template) => (
        <button
          key={template.id}
          type="button"
          className={`sql-panel__chip ${current === template.source ? 'is-active' : ''}`}
          aria-pressed={current === template.source}
          onClick={() => onPick(template.source, template.call)}
        >
          {template.label}
        </button>
      ))}
    </div>
  )
}

function RunStatus() {
  const error = useCodeSimStore((s) => s.error)
  const status = useCodeSimStore((s) => s.status)
  if (status === 'loading') {
    return (
      <p className="code-panel__note" role="status">
        First run downloads Python (about 13 MB, once). Later runs are instant.
      </p>
    )
  }
  if (!error) return null
  return (
    <p className="code-panel__error" role="alert">
      {error.line !== null && <strong>Line {error.line}: </strong>}
      {error.message}
    </p>
  )
}

function useCardDraft() {
  const pageId = useSessionStore((s) => s.pageId)
  const card = useEngineStore((s) => {
    const page = findPage(s.doc, pageId)
    return page ? findCodeCard(page) : null
  })
  const [source, setSource] = useState(card?.text ?? '')
  const [call, setCall] = useState(card?.codeCall ?? '')
  const [pins, setPins] = useState(card?.codePins ?? NO_PINS)
  // Bumped on template pick: remounts the pin inputs so they clear too.
  const [pinsKey, setPinsKey] = useState(0)
  const pickTemplate = (nextSource: string, nextCall: string) => {
    setSource(nextSource)
    setCall(nextCall)
    setPins(NO_PINS)
    setPinsKey((key) => key + 1)
  }
  return {
    source,
    setSource,
    call,
    setCall,
    pins,
    setPins,
    pinsKey,
    pickTemplate,
  }
}

function CallField({
  call,
  onChange,
}: {
  call: string
  onChange: (call: string) => void
}) {
  return (
    <label className="code-panel__call">
      <span className="menu-label">Run with</span>
      <input
        value={call}
        spellCheck={false}
        placeholder="Solution().twoSum([2, 7, 11, 15], 9)"
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  )
}

export function CodePanel() {
  const {
    source,
    setSource,
    call,
    setCall,
    pins,
    setPins,
    pinsKey,
    pickTemplate,
  } = useCardDraft()
  const status = useCodeSimStore((s) => s.status)
  const isBusy = status === 'loading' || status === 'running'
  return (
    <div className="sql-panel code-panel">
      <TemplateChips current={source} onPick={pickTemplate} />
      <textarea
        className="sql-panel__input code-panel__input"
        value={source}
        spellCheck={false}
        aria-label="Python code"
        placeholder="Paste a Python solution here"
        onChange={(event) => setSource(event.target.value)}
        onKeyDown={(event) => indentOnTab(event, setSource)}
      />
      <CallField call={call} onChange={setCall} />
      <PinFields key={pinsKey} pins={pins} onChange={setPins} />
      <div className="sql-panel__actions">
        <button
          type="button"
          className="sql-panel__insert"
          disabled={isBusy || source.trim() === ''}
          onClick={() => void runAndReveal(source, call, pins)}
        >
          {RUN_LABEL[status]}
        </button>
      </div>
      <RunStatus />
      <StepThroughSwitch />
    </div>
  )
}
