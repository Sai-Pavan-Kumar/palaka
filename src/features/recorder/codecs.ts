// Ordered by expected size-for-quality on flat whiteboard content. The spike
// decides the real winner; this order is only the starting guess from the PRD.
const CANDIDATE_MIME_TYPES = [
  'video/webm;codecs=av01',
  'video/webm;codecs=vp9',
  'video/mp4;codecs=avc1.640028',
  'video/mp4',
  'video/webm;codecs=vp8',
  'video/webm',
]

export function listSupportedMimeTypes(): string[] {
  if (typeof MediaRecorder === 'undefined') return []
  return CANDIDATE_MIME_TYPES.filter((type) =>
    MediaRecorder.isTypeSupported(type),
  )
}

export function fileExtensionFor(mimeType: string): string {
  return mimeType.startsWith('video/mp4') ? 'mp4' : 'webm'
}

// Real-time AV1 encoding is heavy on CPU and can drop frames on long takes,
// so recordings default to VP9, then H.264. The spike can promote AV1 later.
const RECORDING_PREFERENCE = [
  'video/webm;codecs=vp9,opus',
  'video/mp4;codecs=avc1.640028,mp4a.40.2',
  'video/webm;codecs=vp8,opus',
  'video/webm',
]

export function pickRecordingMimeType(): string | null {
  if (typeof MediaRecorder === 'undefined') return null
  return (
    RECORDING_PREFERENCE.find((type) => MediaRecorder.isTypeSupported(type)) ??
    null
  )
}
