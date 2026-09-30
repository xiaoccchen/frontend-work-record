import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { WorkRecord, WorkRecordDraft } from '@/types'
import { formatTimestamp } from '@/utils/date'

interface RecordState {
  /** 全部日志，按 id 升序存放，展示时再排序 */
  records: WorkRecord[]
  addRecord: (draft: WorkRecordDraft) => WorkRecord
  updateRecord: (id: number, patch: Partial<WorkRecordDraft>) => void
  removeRecord: (id: number) => void
  clearRecords: () => void
}

/** 自增主键：取当前最大 id + 1 */
function nextId(records: WorkRecord[]): number {
  return records.reduce((max, record) => Math.max(max, record.id), 0) + 1
}

/**
 * 日志数据仓库。
 * 当前使用 localStorage 持久化，后续接入 Electron 时替换为 better-sqlite3 + IPC。
 */
export const useRecordStore = create<RecordState>()(
  persist(
    (set, get) => ({
      records: [],

      addRecord: (draft) => {
        const now = formatTimestamp()
        const record: WorkRecord = {
          ...draft,
          id: nextId(get().records),
          created_at: now,
          updated_at: now,
        }
        set({ records: [...get().records, record] })
        return record
      },

      updateRecord: (id, patch) => {
        const updatedAt = formatTimestamp()
        set({
          records: get().records.map((record) =>
            record.id === id ? { ...record, ...patch, updated_at: updatedAt } : record,
          ),
        })
      },

      removeRecord: (id) => {
        set({ records: get().records.filter((record) => record.id !== id) })
      },

      clearRecords: () => set({ records: [] }),
    }),
    { name: 'frontend-work-record:records' },
  ),
)
