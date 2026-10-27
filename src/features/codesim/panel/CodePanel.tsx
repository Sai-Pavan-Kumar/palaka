import { useState, type KeyboardEvent } from 'react'
import { useEngineStore } from '../../engine/engineStore'
import { findPage } from '../../engine/model/documentOps'
import { useSessionStore } from '../../engine/sessionStore'
import { useCodeSimStore, type CodeSimStatus } from '../codeSimStore'
import { findCodeCard, NO_PINS } from '../codeCard'
import { runOnBoard } from '../runOnBoard'
import { CODE_TEMPLATES } from '../templates'
import { CodeStepControls } from './CodeStepControls'
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
  onPick,
}: {
  onPick: (source: string, call: string) => void
}) {
  return (
    <div className="code-panel__chips" aria-label="Templates">
      {CODE_TEMPLATES.map((template) => (
        <button
          key={template.id}
          type="button"
          className="sql-panel__chip"
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
  return { source, setSource, call, setCall, pins, setPins }
}

export function CodePanel() {
  const { source, setSource, call, setCall, pins, setPins } = useCardDraft()
  const status = useCodeSimStore((s) => s.status)
  // Bumped on template pick: remounts the pin inputs so they clear too.
  const [pinsKey, setPinsKey] = useState(0)
  const isBusy = status === 'loading' || status === 'running'

  return (
    <div className="sql-panel code-panel">
      <TemplateChips
        onPick={(nextSource, nextCall) => {
          setSource(nextSource)
          setCall(nextCall)
          setPins(NO_PINS)
          setPinsKey((key) => key + 1)
        }}
      />
      <textarea
        className="sql-panel__input code-panel__input"
        value={source}
        spellCheck={false}
        aria-label="Python code"
        placeholder="Paste a Python solution here"
        onChange={(event) => setSource(event.target.value)}
        onKeyDown={(event) => indentOnTab(event, setSource)}
      />
      <label className="code-panel__call">
        <span className="menu-label">Run with</span>
        <input
          value={call}
          spellCheck={false}
          placeholder="Solution().twoSum([2, 7, 11, 15], 9)"
          onChange={(event) => setCall(event.target.value)}
        />
      </label>
      <PinFields key={pinsKey} pins={pins} onChange={setPins} />
      <div className="sql-panel__actions">
        <button
          type="button"
          className="sql-panel__insert"
          disabled={isBusy || source.trim() === ''}
          onClick={() => void runOnBoard(source, call, pins)}
        >
          {RUN_LABEL[status]}
        </button>
      </div>
      <RunStatus />
      <StepThroughSwitch />
      <CodeStepControls />
    </div>
  )
}
