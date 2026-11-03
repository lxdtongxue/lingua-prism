import './browserChrome'
import { createRoot } from 'react-dom/client'
import { Survey } from './decision/Survey'
import { SessionGate } from './components/SessionGate'
import './styles/app.css'

createRoot(document.getElementById('root')!).render(<SessionGate><Survey /></SessionGate>)
