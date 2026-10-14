import { useRef } from 'react'
import { BoardFrame } from '../board/BoardFrame'
import { TopBar as LeakTestBar } from '../shell/TopBar'
import { RecorderPanel } from './RecorderPanel'
import './spike.css'

// Phase 1 capture test, reachable at /?spike until bitrate and resolution
// numbers are recorded. Static content mixes large titles, small text, thin
// strokes and a moving dot so one recording shows sharpness and smoothness.
export function CaptureSpikePage() {
  const boardRef = useRef<HTMLDivElement>(null)

  return (
    <main className="stage">
      <BoardFrame ref={boardRef}>
        <div className="spike__content">
          <p className="spike__eyebrow">Lesson 01</p>
          <h1 className="spike__title">How DNS finds a website</h1>
          <p className="spike__body">
            Small text check: if this line is blurry in the recording, the
            bitrate or the capture size is too low.
          </p>
          <svg className="spike__diagram" viewBox="0 0 600 120" aria-hidden>
            <rect x="4" y="30" width="140" height="60" rx="12" />
            <text x="74" y="66">
              Browser
            </text>
            <path d="M150 60 H 290" />
            <path d="M280 52 L 292 60 L 280 68" />
            <rect x="300" y="30" width="140" height="60" rx="12" />
            <text x="370" y="66">
              DNS
            </text>
            <path d="M446 60 H 586" strokeDasharray="6 6" />
          </svg>
        </div>
        <span className="spike__motion-probe" aria-hidden />
      </BoardFrame>
      <LeakTestBar />
      <RecorderPanel boardRef={boardRef} />
    </main>
  )
}
