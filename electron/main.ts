import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { app, BrowserWindow } from 'electron'
import { openDatabase } from './db'
import { registerIpcHandlers } from './ipc'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

function createWindow(): void {
  const win = new BrowserWindow({
    width: 1280,
    height: 820,
    title: '前端开发工作日志',
    webPreferences: {
      preload: path.join(currentDir, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  // 开发态由 vite-plugin-electron 注入 dev server 地址，打包后加载构建产物
  const devServerUrl = process.env.VITE_DEV_SERVER_URL
  if (devServerUrl) {
    void win.loadURL(devServerUrl)
  } else {
    void win.loadFile(path.join(currentDir, '../dist/index.html'))
  }
}

app.whenReady().then(() => {
  registerIpcHandlers(openDatabase())
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// preload 重新构建后热重载渲染进程
process.on('message', (message) => {
  if (message === 'electron-vite&type=hot-reload') {
    for (const win of BrowserWindow.getAllWindows()) {
      win.webContents.reload()
    }
  }
})
