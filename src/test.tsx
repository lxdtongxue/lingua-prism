import './browserChrome'
import { createRoot } from 'react-dom/client'
import { TestApp } from './tall/TestApp'
import { holdChineseFont } from './tall/fonts'
import './styles/app.css'

holdChineseFont()
createRoot(document.getElementById('root')!).render(<TestApp />)
