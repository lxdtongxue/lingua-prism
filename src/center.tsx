import './browserChrome'
import { createRoot } from 'react-dom/client'
import App from './App'
import { SessionGate } from './components/SessionGate'
import './styles/app.css'

createRoot(document.getElementById('root')!).render(<SessionGate><App /></SessionGate>)
