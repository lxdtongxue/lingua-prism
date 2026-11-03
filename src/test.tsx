import './browserChrome'
import { createRoot } from 'react-dom/client'
import { TestApp } from './tall/TestApp'
import { holdChineseFont } from './tall/fonts'
import { SessionGate } from './components/SessionGate'
import './styles/app.css'

holdChineseFont()
createRoot(document.getElementById('root')!).render(<SessionGate><TestApp /></SessionGate>)
