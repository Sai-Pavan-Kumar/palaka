import tapUrl from './tap-thock.wav'

let context: AudioContext | null = null
let recordingBus: MediaStreamAudioDestinationNode | null = null
let tapBuffer: Promise<AudioBuffer> | null = null

function getContext(): AudioContext {
  context ??= new AudioContext()
  // Browsers start it suspended until a user gesture; every caller is one.
  if (context.state === 'suspended') void context.resume()
  return context
}

function getRecordingBus(): MediaStreamAudioDestinationNode {
  recordingBus ??= getContext().createMediaStreamDestination()
  return recordingBus
}

function loadTap(audio: AudioContext): Promise<AudioBuffer> {
  tapBuffer ??= fetch(tapUrl)
    .then((response) => response.arrayBuffer())
    .then((data) => audio.decodeAudioData(data))
  return tapBuffer
}

// A missing sound must never interrupt the lesson, so failures stay quiet.
export function playTap() {
  const audio = getContext()
  loadTap(audio)
    .then((buffer) => {
      const source = audio.createBufferSource()
      source.buffer = buffer
      source.connect(audio.destination)
      source.connect(getRecordingBus())
      source.start()
    })
    .catch(() => {})
}

// MediaRecorder keeps only one audio track, so the mic and the taps have to
// share one. Returns the track plus how to take the mic back out.
export function mixRecordingAudio(mic: MediaStream | null) {
  const audio = getContext()
  const bus = getRecordingBus()
  const micSource = mic && audio.createMediaStreamSource(mic)
  micSource?.connect(bus)
  return {
    track: bus.stream.getAudioTracks()[0],
    release: () => micSource?.disconnect(),
  }
}
