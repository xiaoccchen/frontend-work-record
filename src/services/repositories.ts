import type {
  BackupData,
  DesktopApi,
  Project,
  ProjectDraft,
  WorkRecord,
  WorkRecordDraft,
  WorkSummary,
  WorkSummaryDraft,
} from '@/types'
import { formatTimestamp } from '@/utils/date'

/** 数据仓库读写接口，桌面端（SQLite via IPC）与浏览器端（localStorage）各自实现 */
export interface RecordRepository {
  list: () => Promise<WorkRecord[]>
  create: (draft: WorkRecordDraft) => Promise<WorkRecord>
  update: (id: number, patch: Partial<WorkRecordDraft>) => Promise<WorkRecord>
  remove: (id: number) => Promise<void>
  clear: () => Promise<void>
}

export interface SummaryRepository {
  list: () => Promise<WorkSummary[]>
  create: (draft: WorkSummaryDraft) => Promise<WorkSummary>
  update: (id: number, patch: Partial<WorkSummaryDraft>) => Promise<WorkSummary>
  remove: (id: number) => Promise<void>
}

export interface ProjectRepository {
  list: () => Promise<Project[]>
  create: (draft: ProjectDraft) => Promise<Project>
  update: (id: number, patch: Partial<ProjectDraft>) => Promise<Project>
  remove: (id: number) => Promise<void>
}

/** 全量数据操作：备份恢复与清空 */
export interface DataRepository {
  replaceAll: (data: BackupData) => Promise<void>
  clearAll: () => Promise<void>
}

const RECORDS_KEY = 'frontend-work-record:db:records'
const SUMMARIES_KEY = 'frontend-work-record:db:summaries'
const PROJECTS_KEY = 'frontend-work-record:db:projects'
/** 旧版 zustand persist 的存储键，仅用于一次性迁移 */
const LEGACY_RECORDS_KEY = 'frontend-work-record:records'
const LEGACY_SUMMARIES_KEY = 'frontend-work-record:summaries'

function readJson<T>(key: string): T | null {
  const raw = localStorage.getItem(key)
  if (!raw) {
    return null
  }
  try {
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

/** 旧版数据包在 { state: { records } } 里 */
function readLegacyState<T>(key: string): T | null {
  return readJson<{ state?: T }>(key)?.state ?? null
}

function nextId(items: { id: number }[]): number {
  return items.reduce((max, item) => Math.max(max, item.id), 0) + 1
}

type PartialRecord = Partial<WorkRecord> & Pick<WorkRecord, 'id'>
type PartialSummary = Partial<WorkSummary> & Pick<WorkSummary, 'id'>
type PartialProject = Partial<Project> & Pick<Project, 'id'>

function hasNumberId(value: unknown): value is { id: number } {
  return typeof value === 'object' && value !== null && typeof (value as { id?: unknown }).id === 'number'
}

/** 补齐旧数据缺失的新增字段 */
function normalizeRecord(raw: PartialRecord): WorkRecord {
  return {
    id: raw.id,
    log_date: raw.log_date ?? '',
    start_time: raw.start_time ?? null,
    end_time: raw.end_time ?? null,
    project_name: raw.project_name ?? '',
    work_content: raw.work_content ?? '',
    work_type: raw.work_type ?? null,
    remark: raw.remark ?? null,
    estimated_hours: raw.estimated_hours ?? null,
    is_key: raw.is_key ?? false,
    workload: raw.workload ?? null,
    tags: Array.isArray(raw.tags) ? raw.tags : [],
    created_at: raw.created_at ?? '',
    updated_at: raw.updated_at ?? '',
  }
}

function normalizeSummary(raw: PartialSummary): WorkSummary {
  return {
    id: raw.id,
    title: raw.title ?? '',
    period_start: raw.period_start ?? '',
    period_end: raw.period_end ?? '',
    template: raw.template ?? 'standard',
    content: raw.content ?? '',
    created_at: raw.created_at ?? '',
    updated_at: raw.updated_at ?? '',
  }
}

function normalizeProject(raw: PartialProject): Project {
  return {
    id: raw.id,
    name: raw.name ?? '',
    description: raw.description ?? null,
    created_at: raw.created_at ?? '',
  }
}

function loadLocalRecords(): WorkRecord[] {
  const stored = readJson<unknown[]>(RECORDS_KEY)
  if (Array.isArray(stored)) {
    return stored.filter(hasNumberId).map(normalizeRecord)
  }
  const legacy = readLegacyState<{ records?: unknown[] }>(LEGACY_RECORDS_KEY)
  const records = (legacy?.records ?? []).filter(hasNumberId).map(normalizeRecord)
  localStorage.setItem(RECORDS_KEY, JSON.stringify(records))
  if (legacy) {
    localStorage.removeItem(LEGACY_RECORDS_KEY)
  }
  return records
}

function saveLocalRecords(records: WorkRecord[]): void {
  localStorage.setItem(RECORDS_KEY, JSON.stringify(records))
}

function loadLocalSummaries(): WorkSummary[] {
  const stored = readJson<unknown[]>(SUMMARIES_KEY)
  if (Array.isArray(stored)) {
    return stored.filter(hasNumberId).map(normalizeSummary)
  }
  const legacy = readLegacyState<{ summaries?: unknown[] }>(LEGACY_SUMMARIES_KEY)
  const summaries = (legacy?.summaries ?? []).filter(hasNumberId).map(normalizeSummary)
  localStorage.setItem(SUMMARIES_KEY, JSON.stringify(summaries))
  if (legacy) {
    localStorage.removeItem(LEGACY_SUMMARIES_KEY)
  }
  return summaries
}

function saveLocalSummaries(summaries: WorkSummary[]): void {
  localStorage.setItem(SUMMARIES_KEY, JSON.stringify(summaries))
}

function loadLocalProjects(): Project[] {
  const stored = readJson<unknown[]>(PROJECTS_KEY)
  return Array.isArray(stored) ? stored.filter(hasNumberId).map(normalizeProject) : []
}

function saveLocalProjects(projects: Project[]): void {
  localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects))
}

const localRecordRepository: RecordRepository = {
  list: async () => loadLocalRecords(),

  create: async (draft) => {
    const records = loadLocalRecords()
    const now = formatTimestamp()
    const record: WorkRecord = { ...draft, id: nextId(records), created_at: now, updated_at: now }
    saveLocalRecords([...records, record])
    return record
  },

  update: async (id, patch) => {
    const records = loadLocalRecords()
    const current = records.find((item) => item.id === id)
    if (!current) {
      throw new Error(`日志 #${id} 不存在`)
    }
    const updated: WorkRecord = { ...current, ...patch, updated_at: formatTimestamp() }
    saveLocalRecords(records.map((item) => (item.id === id ? updated : item)))
    return updated
  },

  remove: async (id) => {
    saveLocalRecords(loadLocalRecords().filter((item) => item.id !== id))
  },

  clear: async () => {
    saveLocalRecords([])
  },
}

const localSummaryRepository: SummaryRepository = {
  list: async () => loadLocalSummaries(),

  create: async (draft) => {
    const summaries = loadLocalSummaries()
    const now = formatTimestamp()
    const summary: WorkSummary = {
      ...draft,
      id: nextId(summaries),
      created_at: now,
      updated_at: now,
    }
    saveLocalSummaries([...summaries, summary])
    return summary
  },

  update: async (id, patch) => {
    const summaries = loadLocalSummaries()
    const current = summaries.find((item) => item.id === id)
    if (!current) {
      throw new Error(`总结 #${id} 不存在`)
    }
    const updated: WorkSummary = { ...current, ...patch, updated_at: formatTimestamp() }
    saveLocalSummaries(summaries.map((item) => (item.id === id ? updated : item)))
    return updated
  },

  remove: async (id) => {
    saveLocalSummaries(loadLocalSummaries().filter((item) => item.id !== id))
  },
}

const localProjectRepository: ProjectRepository = {
  list: async () => loadLocalProjects(),

  create: async (draft) => {
    const projects = loadLocalProjects()
    const name = draft.name.trim()
    if (projects.some((item) => item.name === name)) {
      throw new Error(`项目「${name}」已存在`)
    }
    const project: Project = {
      id: nextId(projects),
      name,
      description: draft.description?.trim() || null,
      created_at: formatTimestamp(),
    }
    saveLocalProjects([...projects, project])
    return project
  },

  update: async (id, patch) => {
    const projects = loadLocalProjects()
    const current = projects.find((item) => item.id === id)
    if (!current) {
      throw new Error(`项目 #${id} 不存在`)
    }
    const name = (patch.name ?? current.name).trim()
    if (projects.some((item) => item.id !== id && item.name === name)) {
      throw new Error(`项目「${name}」已存在`)
    }
    const updated: Project = {
      ...current,
      name,
      description:
        patch.description === undefined ? current.description : patch.description?.trim() || null,
    }
    saveLocalProjects(projects.map((item) => (item.id === id ? updated : item)))
    return updated
  },

  remove: async (id) => {
    saveLocalProjects(loadLocalProjects().filter((item) => item.id !== id))
  },
}

const localDataRepository: DataRepository = {
  replaceAll: async (data) => {
    saveLocalRecords(data.records)
    saveLocalSummaries(data.summaries)
    saveLocalProjects(data.projects)
  },

  clearAll: async () => {
    saveLocalRecords([])
    saveLocalSummaries([])
    saveLocalProjects([])
  },
}

function requireDesktopApi(): DesktopApi {
  const api = window.api
  if (!api) {
    throw new Error('Electron 数据接口未注入，无法读写 SQLite')
  }
  return api
}

const desktopRecordRepository: RecordRepository = {
  list: () => requireDesktopApi().records.list(),
  create: (draft) => requireDesktopApi().records.create(draft),
  update: (id, patch) => requireDesktopApi().records.update(id, patch),
  remove: (id) => requireDesktopApi().records.remove(id),
  clear: () => requireDesktopApi().records.clear(),
}

const desktopSummaryRepository: SummaryRepository = {
  list: () => requireDesktopApi().summaries.list(),
  create: (draft) => requireDesktopApi().summaries.create(draft),
  update: (id, patch) => requireDesktopApi().summaries.update(id, patch),
  remove: (id) => requireDesktopApi().summaries.remove(id),
}

const desktopProjectRepository: ProjectRepository = {
  list: () => requireDesktopApi().projects.list(),
  create: (draft) => requireDesktopApi().projects.create(draft),
  update: (id, patch) => requireDesktopApi().projects.update(id, patch),
  remove: (id) => requireDesktopApi().projects.remove(id),
}

const desktopDataRepository: DataRepository = {
  replaceAll: (data) => requireDesktopApi().data.replaceAll(data),
  clearAll: () => requireDesktopApi().data.clearAll(),
}

/** 是否运行在 Electron 中（preload 已注入 window.api） */
export const isDesktop = typeof window !== 'undefined' && Boolean(window.api)

export const recordRepository: RecordRepository = isDesktop
  ? desktopRecordRepository
  : localRecordRepository

export const summaryRepository: SummaryRepository = isDesktop
  ? desktopSummaryRepository
  : localSummaryRepository

export const projectRepository: ProjectRepository = isDesktop
  ? desktopProjectRepository
  : localProjectRepository

export const dataRepository: DataRepository = isDesktop
  ? desktopDataRepository
  : localDataRepository
