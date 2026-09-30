/** 工作类型，对应数据模型 work_record.work_type 字段 */
export type WorkType = '页面开发' | 'Bug 修复' | '代码 Review' | '需求沟通' | '部署上线' | '学习调研'

/** 工作量等级，对应数据模型 work_record.workload 字段 */
export type WorkloadLevel = '轻量' | '常规' | '繁重'

/** work_record 工作日志主表 */
export interface WorkRecord {
  id: number
  /** 工作日期 YYYY-MM-DD，用于按月 / 季度筛选 */
  log_date: string
  /** 开始时间 HH:mm */
  start_time: string | null
  /** 结束时间 HH:mm */
  end_time: string | null
  /** 项目名称 */
  project_name: string
  /** 工作详细内容 */
  work_content: string
  /** 工作类型 */
  work_type: WorkType | null
  /** 备注：阻塞问题、待跟进事项 */
  remark: string | null
  /** 预估花费工时，2.5 代表 2.5 小时 */
  estimated_hours: number | null
  /** 重点工作标记，生成总结时优先提取 */
  is_key: boolean
  /** 工作量等级 */
  workload: WorkloadLevel | null
  /** 自定义标签 */
  tags: string[]
  /** 创建时间 YYYY-MM-DD HH:mm:ss */
  created_at: string
  /** 最后修改时间 YYYY-MM-DD HH:mm:ss */
  updated_at: string
}

/** 新增日志时的表单数据，主键与时间戳由存储层生成 */
export type WorkRecordDraft = Omit<WorkRecord, 'id' | 'created_at' | 'updated_at'>

/** project 项目字典表 */
export interface Project {
  id: number
  name: string
  description: string | null
  created_at: string
}

/** 新增/编辑项目时的表单数据，主键与创建时间由存储层生成 */
export type ProjectDraft = Omit<Project, 'id' | 'created_at'>

/** 统计周期区间，均为 YYYY-MM-DD */
export interface Period {
  start: string
  end: string
}

/** 总结模板：通用标准版 / 技术侧重版 */
export type SummaryTemplateId = 'standard' | 'tech'

export interface SummaryTemplateMeta {
  id: SummaryTemplateId
  name: string
  description: string
}

/** 已保存的历史总结 */
export interface WorkSummary {
  id: number
  title: string
  period_start: string
  period_end: string
  template: SummaryTemplateId
  content: string
  created_at: string
  updated_at: string
}

export type WorkSummaryDraft = Omit<WorkSummary, 'id' | 'created_at' | 'updated_at'>

/** 全量数据快照，用于备份导出 / 恢复导入 / 清空 */
export interface BackupData {
  records: WorkRecord[]
  summaries: WorkSummary[]
  projects: Project[]
}

/** 备份文件结构，schemaVersion 用于后续版本兼容处理 */
export interface BackupFile extends BackupData {
  app: 'frontend-work-record'
  schemaVersion: number
  exportedAt: string
}

/** Electron 主进程通过 preload 暴露给渲染进程的 SQLite 数据接口 */
export interface DesktopApi {
  records: {
    list: () => Promise<WorkRecord[]>
    create: (draft: WorkRecordDraft) => Promise<WorkRecord>
    update: (id: number, patch: Partial<WorkRecordDraft>) => Promise<WorkRecord>
    remove: (id: number) => Promise<void>
    clear: () => Promise<void>
  }
  summaries: {
    list: () => Promise<WorkSummary[]>
    create: (draft: WorkSummaryDraft) => Promise<WorkSummary>
    update: (id: number, patch: Partial<WorkSummaryDraft>) => Promise<WorkSummary>
    remove: (id: number) => Promise<void>
  }
  projects: {
    list: () => Promise<Project[]>
    create: (draft: ProjectDraft) => Promise<Project>
    update: (id: number, patch: Partial<ProjectDraft>) => Promise<Project>
    remove: (id: number) => Promise<void>
  }
  data: {
    replaceAll: (data: BackupData) => Promise<void>
    clearAll: () => Promise<void>
  }
}
