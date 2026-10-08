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
export const DATA_SCHEMA_VERSION = 2

/** 快捷短语初值，仅在首次建表 / 首次运行时写入 */
export const DEFAULT_QUICK_PHRASES = [
  '解决页面兼容性问题，主流浏览器与 IE 表现一致',
  '优化页面加载性能，首屏渲染时间明显下降',
  '对接后端接口联调，处理字段映射与异常分支',
  '修复线上 Bug，补充回归验证用例',
  '页面样式重构，设计稿还原度对齐',
  '抽离公共组件，减少重复代码',
  '代码 Review，跟进评审意见修改',
  '梳理需求文档，输出前端技术方案',
]
