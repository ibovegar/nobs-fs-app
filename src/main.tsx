import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import { isNative } from '~/io'
import { injectThemeCssVars } from '~/theme'
import './index.css'
import App from './App.tsx'

injectThemeCssVars()

const rootElement = document.getElementById('root')
if (!rootElement) throw new Error('Root element #root not found')

createRoot(rootElement).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)

// The native window is created hidden (`visible: false` in tauri.conf.json) so
// the user never sees WebView2's white init surface. Reveal it once the app has
// rendered and painted — two rAFs ensures the first frame is on screen first.
if (isNative()) {
  void import('@tauri-apps/api/window').then(({ getCurrentWindow }) => {
    const win = getCurrentWindow()
    requestAnimationFrame(() => requestAnimationFrame(() => void win.show()))
  })
}
