import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
    plugins: [react()],
    esbuild: {
        jsx: 'react-jsx'
    },
    optimizeDeps: {
        include: ['react', 'react-dom']
    },
    server: {
        port: 5173
    }
})