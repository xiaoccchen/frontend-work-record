import path from 'node:path'
import Database from 'better-sqlite3'
import { app } from 'electron'
import type {
  Project,
  WorkloadLevel,
  WorkRecord,
  WorkRecordDraft,
  WorkSummary,
  WorkSummaryDraft,
} from '../src/types'

/** 表结构版本，通过 PRAGMA user_version 记录，后续字段变更时递增并补 ALTER */
const SCHEMA_VERSION = 1

const SCHEMA = `
CREATE TABLE IF NOT EXISTS work_record (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  log_date        TEXT NOT NULL,
  start_time      TEXT,
  end_time        TEXT,
  project_name    TEXT NOT NULL,
  work_content    TEXT NOT NULL,
  work_type       TEXT,
  remark          TEXT,
  estimated_hours REAL,
  is_key          INTEGER NOT NULL DEFAULT 0,
  workload        TEXT,
  tags            TEXT NOT NULL DEFAULT '[]',
  created_at      TEXT NOT NULL,
  updated_at      TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_work_record_log_date ON work_record (log_date);

CREATE TABLE IF NOT EXISTS project (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS work_summary (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  title        TEXT NOT NULL,
  period_start TEXT NOT NULL,
  period_end   TEXT NOT NULL,
  template     TEXT NOT NULL,
  content      TEXT NOT NULL,
  created_at   TEXT NOT NULL,
  updated_at   TEXT NOT NULL
);
`

export interface WorkRecordRow {
  id: number
  log_date: string
  start_time: string | null
  end_time: string | null
  project_name: string
  work_content: string
  work_type: string | null
  remark: string | null
  estimated_hours: number | null
  is_key: number
  workload: string | null
  tags: string
  created_at: string
  updated_at: string
}

export interface WorkSummaryRow {
  id: number
  title: string
  period_start: string
  period_end: string
  template: string
  content: string
  created_at: string
  updated_at: string
}

export interface ProjectRow {
  id: number
  name: string
  description: string | null
  created_at: string
}

/** 数据库文件放在用户数据目录，卸载应用前不会被清掉 */
export function openDatabase(): Database.Database {
  const db = new Database(path.join(app.getPath('userData'), 'work-record.db'))
  db.pragma('journal_mode = WAL')
  migrate(db)
  return db
}

function migrate(db: Database.Database): void {
  const version = db.pragma('user_version', { simple: true }) as number
  if (version >= SCHEMA_VERSION) {
    return
  }
  db.exec(SCHEMA)
  db.pragma(`user_version = ${SCHEMA_VERSION}`)
}

/** 本地时间戳，格式与渲染进程保持一致 */
export function formatTimestamp(date: Date = new Date()): string {
  const pad = (value: number) => String(value).padStart(2, '0')
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ` +
    `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
  )
}

function parseTags(raw: string): string[] {
  try {
    const value: unknown = JSON.parse(raw)
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []
  } catch {
    return []
  }
}

export function toWorkRecord(row: WorkRecordRow): WorkRecord {
  return {
    id: row.id,
    log_date: row.log_date,
    start_time: row.start_time,
    end_time: row.end_time,
    project_name: row.project_name,
    work_content: row.work_content,
    work_type: row.work_type as WorkRecord['work_type'],
    remark: row.remark,
    estimated_hours: row.estimated_hours,
    is_key: row.is_key === 1,
    workload: row.workload as WorkloadLevel | null,
    tags: parseTags(row.tags),
    created_at: row.created_at,
    updated_at: row.updated_at,
  }
}

export function toWorkRecordParams(record: WorkRecordDraft | WorkRecord) {
  return {
    log_date: record.log_date,
    start_time: record.start_time ?? null,
    end_time: record.end_time ?? null,
    project_name: record.project_name,
    work_content: record.work_content,
    work_type: record.work_type ?? null,
    remark: record.remark ?? null,
    estimated_hours: record.estimated_hours ?? null,
    is_key: record.is_key ? 1 : 0,
    workload: record.workload ?? null,
    tags: JSON.stringify(record.tags ?? []),
  }
}

export function toWorkSummary(row: WorkSummaryRow): WorkSummary {
  return {
    id: row.id,
    title: row.title,
    period_start: row.period_start,
    period_end: row.period_end,
    template: row.template as WorkSummary['template'],
    content: row.content,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }
}

export function toWorkSummaryParams(summary: WorkSummaryDraft | WorkSummary) {
  return {
    title: summary.title,
    period_start: summary.period_start,
    period_end: summary.period_end,
    template: summary.template,
    content: summary.content,
  }
}

export function toProject(row: ProjectRow): Project {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    created_at: row.created_at,
  }
}
