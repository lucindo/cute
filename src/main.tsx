import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { App } from './app/App.tsx'
import { requestPersistence } from './storage/persistence.ts'

// Fire-and-forget by design: never throws, and nothing consumes the granted
// flag yet (the Collection storage gauge will, via navigator.storage).
void requestPersistence()

const rootEl = document.getElementById('root')
if (rootEl === null) throw new Error('Root element #root not found in index.html')
createRoot(rootEl).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
