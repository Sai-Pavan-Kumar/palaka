import { Hand, Volume2, VolumeX } from 'lucide-react'
import { IconButton } from '../../shared/ui/IconButton'
import { Popover } from '../../shared/ui/Popover'
import {
  HANDS,
  updateHandSettings,
  useHandSettings,
  type HandId,
} from './handSettings'

function HandArt({ id }: { id: HandId }) {
  const art = HANDS[id]
  return (
    <span
      className="hand-choice__art"
      aria-hidden
      style={{
        backgroundImage: `url(${art.url})`,
        backgroundPosition: `${-art.tipX * 48 + 12}px ${-art.handTop * 72}px`,
      }}
    />
  )
}

function HandChoice({ id, isActive }: { id: HandId; isActive: boolean }) {
  return (
    <button
      type="button"
      className={`hand-choice ${isActive ? 'is-active' : ''}`}
      aria-label={HANDS[id].label}
      aria-pressed={isActive}
      title={HANDS[id].label}
      onClick={() => updateHandSettings({ handId: id })}
    >
      <HandArt id={id} />
    </button>
  )
}

// Hand picks and sound live behind one button: five extra buttons in the
// style bar pushed it past the screen edge on laptops and phones.
function HandStyleMenu({
  handId,
  soundOn,
}: {
  handId: HandId
  soundOn: boolean
}) {
  return (
    <Popover
      side="below"
      trigger={({ toggle }) => (
        <button
          type="button"
          className="hand-choice"
          aria-label="Hand style and tap sound"
          title="Hand style and tap sound"
          onClick={toggle}
        >
          <HandArt id={handId} />
        </button>
      )}
    >
      {() => (
        <div className="hand-menu">
          <div className="hand-menu__row">
            {(Object.keys(HANDS) as HandId[]).map((id) => (
              <HandChoice key={id} id={id} isActive={id === handId} />
            ))}
          </div>
          <button
            type="button"
            className={`menu-item ${soundOn ? 'is-active' : ''}`}
            aria-pressed={soundOn}
            onClick={() => updateHandSettings({ soundOn: !soundOn })}
          >
            {soundOn ? (
              <Volume2 size={18} strokeWidth={1.75} aria-hidden />
            ) : (
              <VolumeX size={18} strokeWidth={1.75} aria-hidden />
            )}
            Tap sound
          </button>
        </div>
      )}
    </Popover>
  )
}

export function HandControls() {
  const { isOn, soundOn, handId } = useHandSettings()
  return (
    <>
      <IconButton
        icon={Hand}
        label={isOn ? 'Hide the pointer hand' : 'Show the pointer hand'}
        shortcut="H"
        isActive={isOn}
        onClick={() => updateHandSettings({ isOn: !isOn })}
      />
      {isOn && <HandStyleMenu handId={handId} soundOn={soundOn} />}
    </>
  )
}
