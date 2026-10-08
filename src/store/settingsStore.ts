import { create } from 'zustand'
import { settingsRepository } from '@/services/repositories'

interface SettingsState {
  /** 键值型配置，读取时按 key 取值 */
  settings: Record<string, string>
  /** 是否已从存储层载入完成 */
  hydrated: boolean
  hydrate: () => Promise<void>
  setSetting: (key: string, value: string) => Promise<void>
}

/**
 * 应用设置仓库（提醒开关等零散配置）。
 * 持久化落在 SQLite（Electron 主进程 via IPC）或 localStorage（浏览器），
 * 具体实现见 `services/repositories.ts`，这里只维护内存态。
 */
export const useSettingsStore = create<SettingsState>()((set, get) => ({
  settings: {},
  hydrated: false,

  hydrate: async () => {
    const list = await settingsRepository.list()
    set({
      settings: Object.fromEntries(list.map((item) => [item.key, item.value])),
      hydrated: true,
    })
  },

  setSetting: async (key, value) => {
    await settingsRepository.set(key, value)
    set({ settings: { ...get().settings, [key]: value } })
  },
}))
