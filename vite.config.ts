import { fileURLToPath, URL } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { notBundle } from 'vite-plugin-electron/plugin'
import electron from 'vite-plugin-electron/simple'

/** 默认只跑浏览器端；带 ELECTRON=1 时才额外构建并在 Electron 中启动 */
const withElectron = process.env.ELECTRON === '1'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    ...(withElectron
      ? [
          electron({
            main: {
              entry: 'electron/main.ts',
              vite: {
                // better-sqlite3 是原生模块，必须外部化，不能打进产物
                plugins: [notBundle()],
              },
            },
            preload: {
              input: 'electron/preload.ts',
              vite: {
                build: {
                  rollupOptions: {
                    output: {
                      format: 'cjs',
                      entryFileNames: 'preload.cjs',
                      chunkFileNames: 'preload.cjs',
                    },
                  },
                },
              },
            },
          }),
        ]
      : []),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5173,
    open: false,
  },
})
