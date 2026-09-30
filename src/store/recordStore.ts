import { create } from 'zustand'
import { recordRepository } from '@/services/repositories'
import type { WorkRecord, WorkRecordDraft } from '@/types'

interface RecordState {
  /** 全部日志，按 id 升序存放，展示时再排序 */
  records: WorkRecord[]
  /** 是否已从存储层载入完成 */
  hydrated: boolean
  hydrate: () => Promise<void>
  addRecord: (draft: WorkRecordDraft) => Promise<WorkRecord>
  updateRecord: (id: number, patch: Partial<WorkRecordDraft>) => Promise<void>
  removeRecord: (id: number) => Promise<void>
  clearRecords: () => Promise<void>
}

/**
 * 日志数据仓库。
 * 持久化落在 SQLite（Electron 主进程 via IPC）或 localStorage（浏览器），
 * 具体实现见 `services/repositories.ts`，这里只维护内存态。
 */
export const useRecordStore = create<RecordState>()((set, get) => ({
  records: [],
  hydrated: false,

  hydrate: async () => {
    const records = await recordRepository.list()
    set({ records, hydrated: true })
  },

  addRecord: async (draft) => {
    const record = await recordRepository.create(draft)
    set({ records: [...get().records, record] })
    return record
  },

  updateRecord: async (id, patch) => {
    const updated = await recordRepository.update(id, patch)
    set({ records: get().records.map((item) => (item.id === id ? updated : item)) })
  },

  removeRecord: async (id) => {
    await recordRepository.remove(id)
    set({ records: get().records.filter((item) => item.id !== id) })
  },

  clearRecords: async () => {
    await recordRepository.clear()
    set({ records: [] })
  },
}))
