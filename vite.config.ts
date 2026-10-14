import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    // @tldraw/assets imports its fonts and icons with "?url"; the dependency
    // pre-bundler cannot resolve those, so Vite serves the package as-is.
    exclude: ['@tldraw/assets'],
  },
})
