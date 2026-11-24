import { setExplainMode, useExplainStore } from './explainStore'
import { EXPLAIN_MODES, findMode } from './modes'
import './explain.css'

function ModePicker() {
  const active = useExplainStore((s) => s.mode)
  return (
    <div className="explain-modes" role="radiogroup" aria-label="Explain mode">
      {EXPLAIN_MODES.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          type="button"
          role="radio"
          aria-checked={active === id}
          className={`explain-modes__item ${active === id ? 'is-active' : ''}`}
          onClick={() => setExplainMode(id)}
        >
          <Icon size={16} aria-hidden />
          {label}
        </button>
      ))}
    </div>
  )
}

export function ExplainPanel() {
  const mode = findMode(useExplainStore((s) => s.mode))
  return (
    <>
      <ModePicker />
      <mode.Body />
    </>
  )
}
