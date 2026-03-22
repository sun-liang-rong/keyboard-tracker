import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import electron from 'vite-plugin-electron'
import renderer from 'vite-plugin-electron-renderer'
import { resolve } from 'path'
import { copyFileSync, existsSync } from 'fs'

const copyFloatingWindowHtml = () => {
  const srcPath = resolve(__dirname, 'src/main/floating-window.html')
  const destPath = resolve(__dirname, 'dist/main/floating-window.html')
  if (existsSync(srcPath)) {
    copyFileSync(srcPath, destPath)
    console.log('[Vite] Copied floating-window.html to dist/main/')
  }
}

export default defineConfig({
  plugins: [
    vue(),
    electron([
      {
        entry: 'src/main/index.ts',
        onstart: ({ startup }) => {
          copyFloatingWindowHtml()
          const electronApp = (process as unknown as { electronApp?: { kill: () => void; on: (event: string, callback: () => void) => void; removeAllListeners: (event: string) => void } }).electronApp
          if (electronApp) {
            console.log('[Vite] Killing existing electron app, waiting for exit...')
            electronApp.removeAllListeners('exit')
            electronApp.on('exit', () => {
              console.log('[Vite] Old electron app exited, starting new one...')
              ;(process as unknown as { electronApp?: unknown }).electronApp = undefined
              startup()
            })
            electronApp.kill()
          } else {
            console.log('[Vite] No existing app, starting fresh...')
            startup()
          }
        },
        vite: {
          build: {
            outDir: 'dist/main',
            minify: false,
            rollupOptions: {
              external: ['electron'],
            },
          },
        },
      },
      {
        entry: 'src/main/preload.ts',
        onstart: ({ reload }) => {
          reload()
        },
        vite: {
          build: {
            outDir: 'dist/main',
            minify: false,
            rollupOptions: {
              external: ['electron'],
            },
          },
        },
      },
    ]),
    renderer(),
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  build: {
    outDir: 'dist/renderer',
    emptyOutDir: true,
  },
})
