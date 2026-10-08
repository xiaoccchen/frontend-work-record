import { create } from 'zustand'
import { quickPhraseRepository } from '@/services/repositories'
import type { QuickPhrase, QuickPhraseDraft } from '@/types'

interface QuickPhraseState {
  /** 快捷短语，按 id 升序存放 */
  phrases: QuickPhrase[]
  /** 是否已从存储层载入完成 */
  hydrated: boolean
  hydrate: () => Promise<void>
  addPhrase: (draft: QuickPhraseDraft) => Promise<QuickPhrase>
  updatePhrase: (id: number, patch: Partial<QuickPhraseDraft>) => Promise<void>
  removePhrase: (id: number) => Promise<void>
}

/**
 * 快捷短语仓库。
 * 持久化落在 SQLite（Electron 主进程 via IPC）或 localStorage（浏览器），
 * 具体实现见 `services/repositories.ts`，这里只维护内存态。
 */
export const useQuickPhraseStore = create<QuickPhraseState>()((set, get) => ({
  phrases: [],
  hydrated: false,

  hydrate: async () => {
    const phrases = await quickPhraseRepository.list()
    set({ phrases, hydrated: true })
  },

  addPhrase: async (draft) => {
    const phrase = await quickPhraseRepository.create(draft)
    set({ phrases: [...get().phrases, phrase] })
    return phrase
  },

  updatePhrase: async (id, patch) => {
    const updated = await quickPhraseRepository.update(id, patch)
    set({ phrases: get().phrases.map((item) => (item.id === id ? updated : item)) })
  },

  removePhrase: async (id) => {
    await quickPhraseRepository.remove(id)
    set({ phrases: get().phrases.filter((item) => item.id !== id) })
  },
}))
