import { create } from 'zustand'
import { summaryRepository } from '@/services/repositories'
import type { WorkSummary, WorkSummaryDraft } from '@/types'

interface SummaryState {
  /** 已保存的历史总结 */
  summaries: WorkSummary[]
  /** 是否已从存储层载入完成 */
  hydrated: boolean
  hydrate: () => Promise<void>
  saveSummary: (draft: WorkSummaryDraft) => Promise<WorkSummary>
  updateSummary: (id: number, patch: Partial<WorkSummaryDraft>) => Promise<void>
  removeSummary: (id: number) => Promise<void>
}

/**
 * 历史总结仓库。
 * 持久化落在 SQLite（Electron 主进程 via IPC）或 localStorage（浏览器），
 * 具体实现见 `services/repositories.ts`，这里只维护内存态。
 */
export const useSummaryStore = create<SummaryState>()((set, get) => ({
  summaries: [],
  hydrated: false,

  hydrate: async () => {
    const summaries = await summaryRepository.list()
    set({ summaries, hydrated: true })
  },

  saveSummary: async (draft) => {
    const summary = await summaryRepository.create(draft)
    set({ summaries: [...get().summaries, summary] })
    return summary
  },

  updateSummary: async (id, patch) => {
    const updated = await summaryRepository.update(id, patch)
    set({ summaries: get().summaries.map((item) => (item.id === id ? updated : item)) })
  },

  removeSummary: async (id) => {
    await summaryRepository.remove(id)
    set({ summaries: get().summaries.filter((item) => item.id !== id) })
  },
}))
