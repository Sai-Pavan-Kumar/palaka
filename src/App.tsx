import { CaptureSpikePage } from './features/recorder/CaptureSpikePage'
import { Workspace } from './features/shell/Workspace'
import './app.css'

// /?spike keeps the Phase 1 capture test reachable until its numbers are in.
const IS_CAPTURE_SPIKE = new URLSearchParams(window.location.search).has(
  'spike',
)

export default function App() {
  return IS_CAPTURE_SPIKE ? <CaptureSpikePage /> : <Workspace />
}
