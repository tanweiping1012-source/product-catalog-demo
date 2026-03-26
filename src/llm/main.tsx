import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import LlmApp from './page/LlmApp'
import './page/llm.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LlmApp />
  </StrictMode>,
)
