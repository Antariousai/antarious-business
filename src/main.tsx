import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { clearAntariousStorage } from './lib/clearAntariousStorage'

// ?reset=1 forces a fresh first page (login)
const params = new URLSearchParams(window.location.search)
if (params.has('reset')) {
  clearAntariousStorage()
  params.delete('reset')
  const next = params.toString()
  window.history.replaceState({}, '', next ? `/?${next}` : '/')
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
