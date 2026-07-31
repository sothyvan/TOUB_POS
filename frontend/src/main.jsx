import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './app/App.jsx'
import AppErrorBoundary from './app/AppErrorBoundary.jsx'
import { ThemeProvider } from './shared/theme/ThemeContext.jsx'
import { NotificationProvider } from './shared/notifications/NotificationProvider.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AppErrorBoundary>
      <ThemeProvider>
        <NotificationProvider>
          <App />
        </NotificationProvider>
      </ThemeProvider>
    </AppErrorBoundary>
  </StrictMode>,
)
