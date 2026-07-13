import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { App } from './app/App.tsx'
import { requestPersistence } from './storage/persistence.ts'

// Fire-and-forget by design: never throws, and nothing consumes the granted
// flag yet (the Collection storage gauge will, via navigator.storage).
void requestPersistence()

// Dev-only: expose the performance-pass library seeder on window. Dynamic
// import so the whole module tree-shakes out of the production bundle.
if (import.meta.env.DEV) {
  void import('./dev/seed.ts').then((m) => {
    m.installDevSeed()
  })
}

const rootEl = document.getElementById('root')
if (rootEl === null) throw new Error('Root element #root not found in index.html')
createRoot(rootEl).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
