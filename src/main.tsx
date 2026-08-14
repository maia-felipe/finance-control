import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
// Inicializa o i18next antes do primeiro render — hooks e helpers fora do
// React chamam i18n.t() diretamente.
import './i18n'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
