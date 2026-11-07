import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/fonts.css'
import './styles/tokens.css'
import './index.css'
import App from './App.tsx'
import { warmPenStrokes } from './features/engine/render/penStrokes'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Only a speed-up: letters not warmed are extracted when first written.
warmPenStrokes().catch((error: unknown) => {
  console.warn('Could not prepare handwriting strokes', error)
})
