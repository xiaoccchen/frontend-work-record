import type { Period, SummaryTemplateId, WorkRecord } from '@/types'

const UNCATEGORIZED = '未分类'
const PROBLEM_TYPES = ['Bug 修复']
const ACCUMULATION_TYPES = ['学习调研', '代码 Review']

interface TypeGroup {
  type: string
  records: WorkRecord[]
  hours: number
}

interface ProjectGroup {
  name: string
  records: WorkRecord[]
  hours: number
}

function sumHours(records: WorkRecord[]): number {
  return records.reduce((total, record) => total + (record.estimated_hours ?? 0), 0)
}

function formatHours(hours: number): string {
  return Number.isInteger(hours) ? String(hours) : hours.toFixed(1)
}

function sortByHoursDesc(records: WorkRecord[]): WorkRecord[] {
  return [...records].sort((a, b) => (b.estimated_hours ?? 0) - (a.estimated_hours ?? 0))
}

function groupByType(records: WorkRecord[]): TypeGroup[] {
  const groups = new Map<string, WorkRecord[]>()
  records.forEach((record) => {
    const key = record.work_type ?? UNCATEGORIZED
    groups.set(key, [...(groups.get(key) ?? []), record])
  })
  return [...groups.entries()]
    .map(([type, list]) => ({ type, records: sortByHoursDesc(list), hours: sumHours(list) }))
    .sort((a, b) => b.hours - a.hours || b.records.length - a.records.length)
}

function groupByProject(records: WorkRecord[]): ProjectGroup[] {
  const groups = new Map<string, WorkRecord[]>()
  records.forEach((record) => {
    groups.set(record.project_name, [...(groups.get(record.project_name) ?? []), record])
  })
  return [...groups.entries()]
    .map(([name, list]) => ({ name, records: sortByHoursDesc(list), hours: sumHours(list) }))
    .sort((a, b) => b.hours - a.hours || b.records.length - a.records.length)
}

function uniqueProjects(records: WorkRecord[]): string[] {
  return [...new Set(records.map((record) => record.project_name))].sort()
}

/** 多行内容缩进后作为列表项，避免 Markdown 列表结构被换行打断 */
function toBullet(text: string): string {
  return `- ${text.replace(/\n/g, '\n  ')}`
}

function renderOverview(
  records: WorkRecord[],
  period: Period,
  templateId: SummaryTemplateId,
): string {
  const projects = uniqueProjects(records)
  const groups = groupByType(records)
  const lines = [
    '## 一、周期工作概述',
    '',
    `本周期（${period.start} 至 ${period.end}）共完成工作 ${records.length} 项，涉及项目 ${projects.length} 个（${projects.join('、')}），累计预估工时 ${formatHours(sumHours(records))} 小时。`,
    '',
    `工作类型分布：${groups
      .map((group) => `${group.type} ${group.records.length} 项（${formatHours(group.hours)} 小时）`)
      .join('；')}。`,
  ]

  if (templateId === 'tech') {
    lines.push(
      '',
      `各项目工时投入：${groupByProject(records)
        .map((group) => `${group.name} ${formatHours(group.hours)} 小时`)
        .join('；')}。`,
    )
  }

  return `${lines.join('\n')}\n`
}

function renderAchievements(
  records: WorkRecord[],
  templateId: SummaryTemplateId,
): string {
  const lines = ['## 二、核心工作成果', '']

  if (templateId === 'tech') {
    groupByProject(records).forEach((group) => {
      lines.push(`**${group.name}（${group.records.length} 项，${formatHours(group.hours)} 小时）**`)
      group.records.forEach((record) => {
        const meta = [
          record.work_type,
          record.estimated_hours != null ? `${record.estimated_hours} 小时` : null,
        ]
          .filter(Boolean)
          .join('，')
        lines.push(toBullet(meta ? `${record.work_content}（${meta}）` : record.work_content))
      })
      lines.push('')
    })
  } else {
    groupByType(records).forEach((group) => {
      lines.push(`**${group.type}（${group.records.length} 项，${formatHours(group.hours)} 小时）**`)
      group.records.forEach((record) => {
        lines.push(toBullet(`【${record.project_name}】${record.work_content}`))
      })
      lines.push('')
    })
  }

  return `${lines.join('\n')}\n`
}

function renderProblems(records: WorkRecord[]): string {
  const problems = records.filter(
    (record) => record.work_type != null && PROBLEM_TYPES.includes(record.work_type),
  )
  if (problems.length === 0) {
    return `## 三、问题与优化\n\n本周期无 Bug 修复类记录。\n`
  }
  const lines = ['## 三、问题与优化', '']
  problems.forEach((record) => {
    lines.push(toBullet(`【${record.project_name}】${record.work_content}`))
  })
  return `${lines.join('\n')}\n`
}

function renderAccumulation(records: WorkRecord[]): string {
  const items = records.filter(
    (record) => record.work_type != null && ACCUMULATION_TYPES.includes(record.work_type),
  )
  if (items.length === 0) {
    return `## 四、技术沉淀\n\n本周期暂无技术调研、代码评审类记录。\n`
  }
  const lines = ['## 四、技术沉淀', '']
  items.forEach((record) => {
    lines.push(toBullet(`【${record.work_type}·${record.project_name}】${record.work_content}`))
  })
  return `${lines.join('\n')}\n`
}

function renderNextPlan(records: WorkRecord[]): string {
  const pending = records.filter((record) => record.remark?.trim())
  if (pending.length === 0) {
    return `## 五、后续工作计划\n\n本周期暂无待跟进事项。\n`
  }
  const lines = ['## 五、后续工作计划', '']
  pending.forEach((record) => {
    lines.push(toBullet(`【${record.project_name}】${record.remark}`))
  })
  return `${lines.join('\n')}\n`
}

/**
 * 将总结 Markdown 转为纯文本，用于 TXT 导出。
 * 只去掉排版标记，保留章节编号与层级缩进。
 */
export function summaryToPlainText(markdown: string): string {
  const plain = markdown
    // 标题：去掉 # 标记，保留标题文字
    .replace(/^#{1,6}\s+/gm, '')
    // 加粗：去掉 ** 包裹
    .replace(/\*\*(.+?)\*\*/g, '$1')
    // 列表项：换成普通项目符号
    .replace(/^([^\S\n]*)[-*]\s+/gm, '$1• ')
    // 折叠多余空行
    .replace(/\n{3,}/g, '\n\n')
    .trimEnd()

  return `${plain}\n`
}

/**
 * 根据周期内日志生成总结内容。
 * 五个章节固定为：周期工作概述、核心工作成果、问题与优化、技术沉淀、后续工作计划。
 */
export function buildSummaryContent(
  records: WorkRecord[],
  period: Period,
  templateId: SummaryTemplateId,
): string {
  const title = `# ${period.start} 至 ${period.end} 工作总结`

  if (records.length === 0) {
    return `${title}\n\n本周期（${period.start} 至 ${period.end}）暂无工作日志记录。\n`
  }

  return [
    title,
    '',
    renderOverview(records, period, templateId),
    renderAchievements(records, templateId),
    renderProblems(records),
    renderAccumulation(records),
    renderNextPlan(records),
  ].join('\n')
}
