import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Toaster } from 'sonner'
import App from './App.jsx'
import { AuroraBackground } from './components/ui/aurora-background.jsx'
import './styles/index.css'

// El oscuro es el fallback de primera visita; una preferencia explícita sigue teniendo prioridad.
const savedTheme = localStorage.getItem('sofocles-theme')
document.documentElement.classList.toggle('theme-dark', savedTheme !== 'light')

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuroraBackground />
    <App />
    <Toaster
      position="top-center"
      richColors
      className="sofocles-toaster"
      toastOptions={{
        className: 'sofocles-toast',
        style: { background: 'var(--bg-panel)', color: 'var(--marble)' },
        classNames: { success: 'sofocles-toast--success' },
      }}
    />
  </StrictMode>,
)
