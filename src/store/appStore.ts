import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { WorkRecordDraft } from '@/types'
import { formatLogDate } from '@/utils/date'

/** 空白草稿，日期默认当日 */
export function createEmptyDraft(logDate: string = formatLogDate()): WorkRecordDraft {
  return {
    log_date: logDate,
    start_time: null,
    end_time: null,
    project_name: '',
    work_content: '',
    work_type: null,
    remark: null,
    estimated_hours: null,
    is_key: false,
    workload: null,
    tags: [],
  }
}

interface AppState {
  /** 录入表单草稿，实时写入本地，防止误关闭丢失 */
  draft: WorkRecordDraft
  setDraft: (patch: Partial<WorkRecordDraft>) => void
  resetDraft: (logDate?: string) => void
}

/** 全局 UI 状态 */
export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      draft: createEmptyDraft(),
      setDraft: (patch) => set({ draft: { ...get().draft, ...patch } }),
      resetDraft: (logDate) => set({ draft: createEmptyDraft(logDate) }),
    }),
    {
      name: 'frontend-work-record:app',
      version: 1,
      // 结构未变，仅草稿新增了字段，具体补默认值交给 merge
      migrate: (persisted) => persisted as AppState,
      merge: (persisted, current) => {
        const state = persisted as { draft?: Partial<WorkRecordDraft> }
        return { ...current, draft: { ...createEmptyDraft(), ...state.draft } }
      },
    },
  ),
)
