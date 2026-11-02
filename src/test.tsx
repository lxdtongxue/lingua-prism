import { createRoot } from 'react-dom/client'
import { TestApp } from './tall/TestApp'
import './styles/app.css'

createRoot(document.getElementById('root')!).render(<TestApp />)
