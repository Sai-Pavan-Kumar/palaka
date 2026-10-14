import { useState } from 'react'
import type { RecordingResult } from './boardRecorder'
import { fileExtensionFor } from './codecs'

const BYTES_PER_MEGABYTE = 1024 * 1024
const MS_PER_MINUTE = 60_000
const BITS_PER_BYTE = 8
const BITS_PER_MEGABIT = 1_000_000

type RecordingResultCardProps = {
  result: RecordingResult
}

// The numbers the spike exists to answer: real file weight, and whether
// Chrome honoured the requested bitrate.
function describeFileWeight(result: RecordingResult) {
  const sizeMb = result.blob.size / BYTES_PER_MEGABYTE
  const minutes = result.durationMs / MS_PER_MINUTE
  const actualMbps =
    (result.blob.size * BITS_PER_BYTE) / (result.durationMs * 1000)
  return {
    sizeMb: sizeMb.toFixed(2),
    mbPerMinute: (sizeMb / minutes).toFixed(2),
    actualMbps: actualMbps.toFixed(2),
    seconds: (result.durationMs / 1000).toFixed(1),
  }
}

function ResultFacts({
  result,
  outputResolution,
}: RecordingResultCardProps & { outputResolution: string }) {
  const weight = describeFileWeight(result)
  const requestedMbps = result.videoBitsPerSecond / BITS_PER_MEGABIT
  const { width, height } = result.trackSettings

  return (
    <dl className="result__facts">
      <dt>Output</dt>
      <dd>{outputResolution}</dd>
      <dt>Track size</dt>
      <dd>{width && height ? `${width}×${height}` : 'not reported'}</dd>
      <dt>Length</dt>
      <dd>{weight.seconds} s</dd>
      <dt>Weight</dt>
      <dd>
        {weight.sizeMb} MB · {weight.mbPerMinute} MB/min
      </dd>
      <dt>Bitrate</dt>
      <dd>
        {weight.actualMbps} real / {requestedMbps} asked
      </dd>
      <dt>Codec</dt>
      <dd>
        {result.mimeType} @ {result.frameRate} fps
      </dd>
    </dl>
  )
}

export function RecordingResultCard({ result }: RecordingResultCardProps) {
  // The recorded file is the source of truth for size; track settings can
  // report the full tab even after the crop.
  const [outputResolution, setOutputResolution] = useState('reading…')

  return (
    <article className="result">
      <video
        className="result__video"
        src={result.previewUrl}
        controls
        muted
        onLoadedMetadata={(event) =>
          setOutputResolution(
            `${event.currentTarget.videoWidth}×${event.currentTarget.videoHeight}`,
          )
        }
      />
      <ResultFacts result={result} outputResolution={outputResolution} />
      <a
        className="result__download"
        href={result.previewUrl}
        download={`board-test.${fileExtensionFor(result.mimeType)}`}
      >
        Download
      </a>
    </article>
  )
}
