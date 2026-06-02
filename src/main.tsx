import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { injectThemeCssVars } from '~/theme'
import './index.css'
import App from './App.tsx'

injectThemeCssVars()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
