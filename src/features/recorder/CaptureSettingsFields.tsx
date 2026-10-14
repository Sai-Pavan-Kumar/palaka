import { SelectField } from './SelectField'
import {
  BITRATE_OPTIONS_MBPS,
  FRAME_RATE_OPTIONS,
  type useCaptureSettings,
} from './useCaptureSettings'

type CaptureSettingsFieldsProps = ReturnType<
  typeof useCaptureSettings
>['fieldProps'] & { disabled: boolean }

export function CaptureSettingsFields(props: CaptureSettingsFieldsProps) {
  return (
    <>
      <SelectField
        label="Codec"
        value={props.mimeType}
        options={props.mimeTypes}
        disabled={props.disabled}
        onChange={props.setMimeType}
      />
      <div className="recorder__row">
        <SelectField
          label="Bitrate"
          value={props.bitrateMbps}
          options={BITRATE_OPTIONS_MBPS}
          formatOption={(mbps) => `${mbps} Mbps`}
          disabled={props.disabled}
          onChange={props.setBitrateMbps}
        />
        <SelectField
          label="FPS"
          value={props.frameRate}
          options={FRAME_RATE_OPTIONS}
          disabled={props.disabled}
          onChange={props.setFrameRate}
        />
      </div>
    </>
  )
}
