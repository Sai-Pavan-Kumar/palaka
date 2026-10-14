import { useState } from 'react'
import { listSupportedMimeTypes } from './codecs'
import type { RecordingOptions } from './boardRecorder'

// Bitrates bracket Chrome's 2.5 Mbps default so one session shows where text
// starts to blur and where file size stops being worth it.
export const BITRATE_OPTIONS_MBPS = [1, 1.5, 2.5, 4, 6] as const
export const FRAME_RATE_OPTIONS = [24, 30] as const
const DEFAULT_BITRATE_MBPS = 2.5
const DEFAULT_FRAME_RATE = 30
const BITS_PER_MEGABIT = 1_000_000

export function useCaptureSettings() {
  const [mimeTypes] = useState(listSupportedMimeTypes)
  const [mimeType, setMimeType] = useState(mimeTypes[0] ?? '')
  const [bitrateMbps, setBitrateMbps] = useState<number>(DEFAULT_BITRATE_MBPS)
  const [frameRate, setFrameRate] = useState<number>(DEFAULT_FRAME_RATE)

  const options: RecordingOptions = {
    mimeType,
    videoBitsPerSecond: bitrateMbps * BITS_PER_MEGABIT,
    frameRate,
  }
  const fieldProps = {
    mimeTypes,
    mimeType,
    bitrateMbps,
    frameRate,
    setMimeType,
    setBitrateMbps,
    setFrameRate,
  }
  return { options, fieldProps }
}
