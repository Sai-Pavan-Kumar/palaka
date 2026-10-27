import { useEngineStore } from '../../engine/engineStore'
import { findPage } from '../../engine/model/documentOps'
import { useSessionStore } from '../../engine/sessionStore'
import { findCodeCard, setCodeStepThrough } from '../codeCard'

// Saved on the card, decided while editing: during a take nothing has to be
// remembered, and one video can mix stepped cards with plain ones.
export function StepThroughSwitch() {
  const pageId = useSessionStore((s) => s.pageId)
  const card = useEngineStore((s) => {
    const page = findPage(s.doc, pageId)
    return page ? findCodeCard(page) : null
  })
  return (
    <label className={`code-panel__switch ${card ? '' : 'is-disabled'}`}>
      <input
        type="checkbox"
        checked={card?.codeStepThrough === true}
        disabled={!card}
        onChange={(event) => setCodeStepThrough(event.target.checked)}
      />
      <span>
        Step through when presenting
        <small>
          {card
            ? 'Off: the card is a plain object. On: Space runs the code, then moves on.'
            : 'Run the code once to put a card on this page.'}
        </small>
      </span>
    </label>
  )
}
