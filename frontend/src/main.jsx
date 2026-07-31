import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './app/App.jsx'
import AppErrorBoundary from './app/AppErrorBoundary.jsx'
import { ThemeProvider } from './shared/theme/ThemeContext.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AppErrorBoundary>
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </AppErrorBoundary>
  </StrictMode>,
)
