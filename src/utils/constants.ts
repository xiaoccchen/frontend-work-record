import type { SummaryTemplateMeta, WorkloadLevel, WorkType } from '@/types'

/** 工作类型选项，与 WorkType 保持一致 */
export const WORK_TYPES: WorkType[] = [
  '页面开发',
  'Bug 修复',
  '代码 Review',
  '需求沟通',
  '部署上线',
  '学习调研',
]

/** 工作量等级选项，与 WorkloadLevel 保持一致 */
export const WORKLOAD_LEVELS: WorkloadLevel[] = ['轻量', '常规', '繁重']

/** 总结模板选项 */
export const SUMMARY_TEMPLATES: SummaryTemplateMeta[] = [
  {
    id: 'standard',
    name: '通用标准版',
    description: '按工作类型分类汇总，适合日常月报、季度汇报',
  },
  {
    id: 'tech',
    name: '技术侧重版',
    description: '按项目维度汇总并统计工时投入，适合技术复盘',
  },
]

/** 备份文件的数据结构版本，需与 electron/db.ts 的 SCHEMA_VERSION 保持一致 */
export const DATA_SCHEMA_VERSION = 1
