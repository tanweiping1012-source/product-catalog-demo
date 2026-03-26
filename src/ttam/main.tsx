import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import TtamApp from './page/TtamApp'
import './page/ttam.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <TtamApp />
  </StrictMode>,
)
