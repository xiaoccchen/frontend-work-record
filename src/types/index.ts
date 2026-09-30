/** 工作类型，对应数据模型 work_record.work_type 字段 */
export type WorkType = '页面开发' | 'Bug 修复' | '代码 Review' | '需求沟通' | '部署上线' | '学习调研'

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
