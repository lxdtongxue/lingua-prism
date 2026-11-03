import './browserChrome'
import { createRoot } from 'react-dom/client'
import { Survey } from './decision/Survey'
import './styles/app.css'

createRoot(document.getElementById('root')!).render(<Survey />)
