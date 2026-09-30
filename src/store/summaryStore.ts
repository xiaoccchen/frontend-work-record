import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { WorkSummary, WorkSummaryDraft } from '@/types'
import { formatTimestamp } from '@/utils/date'

interface SummaryState {
  /** 已保存的历史总结 */
  summaries: WorkSummary[]
  saveSummary: (draft: WorkSummaryDraft) => WorkSummary
  updateSummary: (id: number, patch: Partial<WorkSummaryDraft>) => void
  removeSummary: (id: number) => void
}

/** 自增主键：取当前最大 id + 1 */
function nextId(summaries: WorkSummary[]): number {
  return summaries.reduce((max, summary) => Math.max(max, summary.id), 0) + 1
}

/**
 * 历史总结仓库。
 * 当前使用 localStorage 持久化，后续接入 Electron 时替换为 better-sqlite3 + IPC。
 */
export const useSummaryStore = create<SummaryState>()(
  persist(
    (set, get) => ({
      summaries: [],

      saveSummary: (draft) => {
        const now = formatTimestamp()
        const summary: WorkSummary = {
          ...draft,
          id: nextId(get().summaries),
          created_at: now,
          updated_at: now,
        }
        set({ summaries: [...get().summaries, summary] })
        return summary
      },

      updateSummary: (id, patch) => {
        const updatedAt = formatTimestamp()
        set({
          summaries: get().summaries.map((summary) =>
            summary.id === id ? { ...summary, ...patch, updated_at: updatedAt } : summary,
          ),
        })
      },

      removeSummary: (id) => {
        set({ summaries: get().summaries.filter((summary) => summary.id !== id) })
      },
    }),
    { name: 'frontend-work-record:summaries' },
  ),
)
