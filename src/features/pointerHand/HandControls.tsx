import { Hand, Volume2, VolumeX } from 'lucide-react'
import { IconButton } from '../../shared/ui/IconButton'
import {
  HANDS,
  updateHandSettings,
  useHandSettings,
  type HandId,
} from './handSettings'

function HandChoice({ id, isActive }: { id: HandId; isActive: boolean }) {
  const art = HANDS[id]
  return (
    <button
      type="button"
      className={`hand-choice ${isActive ? 'is-active' : ''}`}
      aria-label={art.label}
      aria-pressed={isActive}
      title={art.label}
      onClick={() => updateHandSettings({ handId: id })}
    >
      <span
        className="hand-choice__art"
        style={{
          backgroundImage: `url(${art.url})`,
          backgroundPosition: `${-art.tipX * 48 + 12}px ${-art.handTop * 72}px`,
        }}
      />
    </button>
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
      {isOn &&
        (Object.keys(HANDS) as HandId[]).map((id) => (
          <HandChoice key={id} id={id} isActive={id === handId} />
        ))}
      {isOn && (
        <IconButton
          icon={soundOn ? Volume2 : VolumeX}
          label={soundOn ? 'Mute the tap sound' : 'Turn on the tap sound'}
          isActive={soundOn}
          onClick={() => updateHandSettings({ soundOn: !soundOn })}
        />
      )}
    </>
  )
}
