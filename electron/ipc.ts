import { ipcMain } from 'electron'
import type Database from 'better-sqlite3'
import type {
  BackupData,
  Project,
  ProjectDraft,
  WorkRecord,
  WorkRecordDraft,
  WorkSummary,
  WorkSummaryDraft,
} from '../src/types'
import {
  formatTimestamp,
  toProject,
  toWorkRecord,
  toWorkRecordParams,
  toWorkSummary,
  toWorkSummaryParams,
  type ProjectRow,
  type WorkRecordRow,
  type WorkSummaryRow,
} from './db'

/** 渲染进程只传业务字段，时间戳与自增主键一律由主进程生成 */
export function registerIpcHandlers(db: Database.Database): void {
  const selectRecordById = db.prepare('SELECT * FROM work_record WHERE id = ?')
  const selectRecords = db.prepare('SELECT * FROM work_record ORDER BY id ASC')
  const insertRecord = db.prepare(`
    INSERT INTO work_record (
      log_date, start_time, end_time, project_name, work_content, work_type,
      remark, estimated_hours, is_key, workload, tags, created_at, updated_at
    ) VALUES (
      @log_date, @start_time, @end_time, @project_name, @work_content, @work_type,
      @remark, @estimated_hours, @is_key, @workload, @tags, @created_at, @updated_at
    )
  `)
  const updateRecord = db.prepare(`
    UPDATE work_record SET
      log_date = @log_date, start_time = @start_time, end_time = @end_time,
      project_name = @project_name, work_content = @work_content, work_type = @work_type,
      remark = @remark, estimated_hours = @estimated_hours, is_key = @is_key,
      workload = @workload, tags = @tags, updated_at = @updated_at
    WHERE id = @id
  `)
  const deleteRecord = db.prepare('DELETE FROM work_record WHERE id = ?')

  const selectSummaryById = db.prepare('SELECT * FROM work_summary WHERE id = ?')
  const selectSummarys = db.prepare('SELECT * FROM work_summary ORDER BY id ASC')
  const insertSummary = db.prepare(`
    INSERT INTO work_summary (title, period_start, period_end, template, content, created_at, updated_at)
    VALUES (@title, @period_start, @period_end, @template, @content, @created_at, @updated_at)
  `)
  const updateSummaryStmt = db.prepare(`
    UPDATE work_summary SET
      title = @title, period_start = @period_start, period_end = @period_end,
      template = @template, content = @content, updated_at = @updated_at
    WHERE id = @id
  `)
  const deleteSummary = db.prepare('DELETE FROM work_summary WHERE id = ?')

  const selectProjectById = db.prepare('SELECT * FROM project WHERE id = ?')
  const selectProjects = db.prepare('SELECT * FROM project ORDER BY id ASC')
  const insertProject = db.prepare(`
    INSERT INTO project (name, description, created_at)
    VALUES (@name, @description, @created_at)
  `)
  const updateProject = db.prepare(`
    UPDATE project SET name = @name, description = @description WHERE id = @id
  `)
  const deleteProject = db.prepare('DELETE FROM project WHERE id = ?')

  const clearAllRecords = db.prepare('DELETE FROM work_record')
  const clearAllSummaries = db.prepare('DELETE FROM work_summary')
  const clearAllProjects = db.prepare('DELETE FROM project')

  function findRecord(id: number): WorkRecord {
    const row = selectRecordById.get(id) as WorkRecordRow | undefined
    if (!row) {
      throw new Error(`日志 #${id} 不存在`)
    }
    return toWorkRecord(row)
  }

  function findSummary(id: number): WorkSummary {
    const row = selectSummaryById.get(id) as WorkSummaryRow | undefined
    if (!row) {
      throw new Error(`总结 #${id} 不存在`)
    }
    return toWorkSummary(row)
  }

  function findProject(id: number): Project {
    const row = selectProjectById.get(id) as ProjectRow | undefined
    if (!row) {
      throw new Error(`项目 #${id} 不存在`)
    }
    return toProject(row)
  }

  ipcMain.handle('records:list', () =>
    (selectRecords.all() as WorkRecordRow[]).map(toWorkRecord),
  )

  ipcMain.handle('records:create', (_event, draft: WorkRecordDraft) => {
    const now = formatTimestamp()
    const info = insertRecord.run({ ...toWorkRecordParams(draft), created_at: now, updated_at: now })
    return findRecord(Number(info.lastInsertRowid))
  })

  ipcMain.handle('records:update', (_event, id: number, patch: Partial<WorkRecordDraft>) => {
    const merged: WorkRecord = {
      ...findRecord(id),
      ...stripUndefined(patch),
      updated_at: formatTimestamp(),
    }
    updateRecord.run({ ...toWorkRecordParams(merged), id, updated_at: merged.updated_at })
    return findRecord(id)
  })

  ipcMain.handle('records:remove', (_event, id: number) => {
    deleteRecord.run(id)
  })

  ipcMain.handle('records:clear', () => {
    clearAllRecords.run()
  })

  ipcMain.handle('summaries:list', () =>
    (selectSummarys.all() as WorkSummaryRow[]).map(toWorkSummary),
  )

  ipcMain.handle('summaries:create', (_event, draft: WorkSummaryDraft) => {
    const now = formatTimestamp()
    const info = insertSummary.run({
      ...toWorkSummaryParams(draft),
      created_at: now,
      updated_at: now,
    })
    return findSummary(Number(info.lastInsertRowid))
  })

  ipcMain.handle('summaries:update', (_event, id: number, patch: Partial<WorkSummaryDraft>) => {
    const merged: WorkSummary = {
      ...findSummary(id),
      ...stripUndefined(patch),
      updated_at: formatTimestamp(),
    }
    updateSummaryStmt.run({ ...toWorkSummaryParams(merged), id, updated_at: merged.updated_at })
    return findSummary(id)
  })

  ipcMain.handle('summaries:remove', (_event, id: number) => {
    deleteSummary.run(id)
  })

  ipcMain.handle('projects:list', () =>
    (selectProjects.all() as ProjectRow[]).map(toProject),
  )

  ipcMain.handle('projects:create', (_event, draft: ProjectDraft) => {
    const name = draft.name.trim()
    if (!name) {
      throw new Error('项目名称不能为空')
    }
    const info = runWithUniqueNameGuard(name, () =>
      insertProject.run({
        name,
        description: draft.description?.trim() || null,
        created_at: formatTimestamp(),
      }),
    )
    return findProject(Number(info.lastInsertRowid))
  })

  ipcMain.handle('projects:update', (_event, id: number, patch: Partial<ProjectDraft>) => {
    const current = findProject(id)
    const name = (patch.name ?? current.name).trim()
    if (!name) {
      throw new Error('项目名称不能为空')
    }
    runWithUniqueNameGuard(name, () =>
      updateProject.run({
        id,
        name,
        description: patch.description === undefined ? current.description : patch.description?.trim() || null,
      }),
    )
    return findProject(id)
  })

  ipcMain.handle('projects:remove', (_event, id: number) => {
    deleteProject.run(id)
  })

  ipcMain.handle('data:replace-all', (_event, data: BackupData) => {
    const now = formatTimestamp()
    db.transaction(() => {
      clearAllRecords.run()
      clearAllSummaries.run()
      clearAllProjects.run()
      for (const record of data.records) {
        insertRecord.run({
          ...toWorkRecordParams(record),
          created_at: record.created_at || now,
          updated_at: record.updated_at || now,
        })
      }
      for (const summary of data.summaries) {
        insertSummary.run({
          ...toWorkSummaryParams(summary),
          created_at: summary.created_at || now,
          updated_at: summary.updated_at || now,
        })
      }
      for (const project of data.projects) {
        insertProject.run({
          name: project.name,
          description: project.description ?? null,
          created_at: project.created_at || now,
        })
      }
    })()
  })

  ipcMain.handle('data:clear-all', () => {
    db.transaction(() => {
      clearAllRecords.run()
      clearAllSummaries.run()
      clearAllProjects.run()
    })()
  })
}

/** project.name 有唯一约束，把底层约束错误转成可读提示 */
function runWithUniqueNameGuard<T>(name: string, action: () => T): T {
  try {
    return action()
  } catch (error) {
    if (error instanceof Error && error.message.includes('UNIQUE constraint failed')) {
      throw new Error(`项目「${name}」已存在`)
    }
    throw error
  }
}

/** better-sqlite3 不接受 undefined 绑定值，先剔除 */
function stripUndefined<T extends object>(patch: T): Partial<T> {
  return Object.fromEntries(Object.entries(patch).filter(([, value]) => value !== undefined)) as Partial<T>
}
