import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// iOS may evict local data of a web app under storage pressure; ask the browser to keep it.
// A refusal or a missing API is not an error: the app works without it.
function requestPersistentStorage(): void {
  try {
    if (typeof navigator.storage?.persist !== 'function') return
    void navigator.storage.persist().catch(() => undefined)
  } catch {
    // Some browsers throw synchronously when the API is blocked.
  }
}

requestPersistentStorage()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
