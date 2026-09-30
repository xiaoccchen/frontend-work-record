/// <reference types="vite/client" />

import type { DesktopApi } from '@/types'

declare global {
  interface Window {
    /** Electron preload 注入的 SQLite 数据接口；浏览器环境下为 undefined */
    api?: DesktopApi
  }
}
