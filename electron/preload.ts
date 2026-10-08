import { contextBridge, ipcRenderer } from 'electron'
import type { DesktopApi } from '../src/types'

/** 渲染进程唯一的数据入口，全部走 IPC 交给主进程读写 SQLite */
const api: DesktopApi = {
  records: {
    list: () => ipcRenderer.invoke('records:list'),
    create: (draft) => ipcRenderer.invoke('records:create', draft),
    update: (id, patch) => ipcRenderer.invoke('records:update', id, patch),
    remove: (id) => ipcRenderer.invoke('records:remove', id),
    clear: () => ipcRenderer.invoke('records:clear'),
  },
  summaries: {
    list: () => ipcRenderer.invoke('summaries:list'),
    create: (draft) => ipcRenderer.invoke('summaries:create', draft),
    update: (id, patch) => ipcRenderer.invoke('summaries:update', id, patch),
    remove: (id) => ipcRenderer.invoke('summaries:remove', id),
  },
  projects: {
    list: () => ipcRenderer.invoke('projects:list'),
    create: (draft) => ipcRenderer.invoke('projects:create', draft),
    update: (id, patch) => ipcRenderer.invoke('projects:update', id, patch),
    remove: (id) => ipcRenderer.invoke('projects:remove', id),
  },
  phrases: {
    list: () => ipcRenderer.invoke('phrases:list'),
    create: (draft) => ipcRenderer.invoke('phrases:create', draft),
    update: (id, patch) => ipcRenderer.invoke('phrases:update', id, patch),
    remove: (id) => ipcRenderer.invoke('phrases:remove', id),
  },
  settings: {
    list: () => ipcRenderer.invoke('settings:list'),
    set: (key, value) => ipcRenderer.invoke('settings:set', key, value),
  },
  data: {
    replaceAll: (data) => ipcRenderer.invoke('data:replace-all', data),
    clearAll: () => ipcRenderer.invoke('data:clear-all'),
  },
  app: {
    notify: (title, body) => ipcRenderer.invoke('app:notify', title, body),
    onNavigate: (listener) => {
      ipcRenderer.on('app:navigate', (_event, path: string) => listener(path))
    },
  },
}

contextBridge.exposeInMainWorld('api', api)
