import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

// The engine is a stateful singleton owning a WebGL context. Hot-swapping it
// would leave two instances alive, so its files always trigger a full reload.
const reloadOnEngineChange = (): Plugin => ({
  name: 'reload-on-engine-change',
  handleHotUpdate({ file, server }) {
    if (!file.includes('/src/gl/')) return
    server.ws.send({ type: 'full-reload' })
    return []
  },
})

export default defineConfig({
  plugins: [react(), reloadOnEngineChange()],
  server: { host: true },
  build: {
    target: 'es2022',
    cssMinify: true,
    rollupOptions: { input: { main: 'index.html', test: 'test/index.html', survey: 'survey/index.html' } },
  },
})
