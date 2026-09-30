import type { Period, SummaryTemplateId, WorkloadLevel, WorkRecord } from '@/types'

const UNCATEGORIZED = '未分类'
const PROBLEM_TYPES = ['Bug 修复']
const ACCUMULATION_TYPES = ['学习调研', '代码 Review']

/** 工作量等级权重，用于排序时把繁重的工作排在前面 */
const WORKLOAD_WEIGHT: Record<WorkloadLevel, number> = { 轻量: 1, 常规: 2, 繁重: 3 }

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

/**
 * 重点内容优先排序：重点工作 > 工作量等级 > 预估工时。
 * 生成总结时按此顺序输出，保证核心业绩排在各分组最前面。
 */
function sortByPriority(records: WorkRecord[]): WorkRecord[] {
  return [...records].sort((a, b) => {
    if (a.is_key !== b.is_key) {
      return a.is_key ? -1 : 1
    }
    const weightDiff =
      (b.workload ? WORKLOAD_WEIGHT[b.workload] : 0) - (a.workload ? WORKLOAD_WEIGHT[a.workload] : 0)
    if (weightDiff !== 0) {
      return weightDiff
    }
    return (b.estimated_hours ?? 0) - (a.estimated_hours ?? 0)
  })
}

/** 重点工作加前缀，导出后在纯文本里也能一眼看到 */
function markKey(record: WorkRecord, text: string): string {
  return record.is_key ? `【重点】${text}` : text
}

/** 概述里只取内容首行并截断，避免多行内容打乱段落 */
function briefContent(text: string, maxLength = 40): string {
  const [firstLine = ''] = text.split('\n')
  return firstLine.length > maxLength ? `${firstLine.slice(0, maxLength)}…` : firstLine
}

function groupByType(records: WorkRecord[]): TypeGroup[] {
  const groups = new Map<string, WorkRecord[]>()
  records.forEach((record) => {
    const key = record.work_type ?? UNCATEGORIZED
    groups.set(key, [...(groups.get(key) ?? []), record])
  })
  return [...groups.entries()]
    .map(([type, list]) => ({ type, records: sortByPriority(list), hours: sumHours(list) }))
    .sort((a, b) => b.hours - a.hours || b.records.length - a.records.length)
}

function groupByProject(records: WorkRecord[]): ProjectGroup[] {
  const groups = new Map<string, WorkRecord[]>()
  records.forEach((record) => {
    groups.set(record.project_name, [...(groups.get(record.project_name) ?? []), record])
  })
  return [...groups.entries()]
    .map(([name, list]) => ({ name, records: sortByPriority(list), hours: sumHours(list) }))
    .sort((a, b) => b.hours - a.hours || b.records.length - a.records.length)
}

function uniqueProjects(records: WorkRecord[]): string[] {
  return [...new Set(records.map((record) => record.project_name))].sort()
}

/** 多行内容缩进后作为列表项，避免 Markdown 列表结构被换行打断 */
function toBullet(text: string): string {
  return `- ${text.replace(/\n/g, '\n  ')}`
}

/** 概述里的工作量分布，全部未标注时不展示 */
function renderWorkloadDistribution(records: WorkRecord[]): string | null {
  const parts = (['繁重', '常规', '轻量'] as WorkloadLevel[])
    .map((level) => ({ level, count: records.filter((record) => record.workload === level).length }))
    .filter((item) => item.count > 0)
    .map((item) => `${item.level} ${item.count} 项`)

  if (parts.length === 0) {
    return null
  }

  const unlabeled = records.filter((record) => !record.workload).length
  if (unlabeled > 0) {
    parts.push(`未标注 ${unlabeled} 项`)
  }
  return `工作量分布：${parts.join('；')}。`
}

function renderOverview(
  records: WorkRecord[],
  period: Period,
  templateId: SummaryTemplateId,
): string {
  const projects = uniqueProjects(records)
  const groups = groupByType(records)
  const keyRecords = sortByPriority(records.filter((record) => record.is_key))
  const lines = [
    '## 一、周期工作概述',
    '',
    `本周期（${period.start} 至 ${period.end}）共完成工作 ${records.length} 项（其中重点工作 ${keyRecords.length} 项），涉及项目 ${projects.length} 个（${projects.join('、')}），累计预估工时 ${formatHours(sumHours(records))} 小时。`,
    '',
    `工作类型分布：${groups
      .map((group) => `${group.type} ${group.records.length} 项（${formatHours(group.hours)} 小时）`)
      .join('；')}。`,
  ]

  // 重点工作单独列出，避免淹没在类型分布里
  if (keyRecords.length > 0) {
    lines.push(
      '',
      `重点工作：${keyRecords
        .map((record) => `【${record.project_name}】${briefContent(record.work_content)}`)
        .join('；')}。`,
    )
  }

  const workloadLine = renderWorkloadDistribution(records)
  if (workloadLine) {
    lines.push('', workloadLine)
  }

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
      const keyCount = group.records.filter((record) => record.is_key).length
      const keySuffix = keyCount > 0 ? `，含重点 ${keyCount} 项` : ''
      lines.push(
        `**${group.name}（${group.records.length} 项，${formatHours(group.hours)} 小时${keySuffix}）**`,
      )
      group.records.forEach((record) => {
        const meta = [
          record.work_type,
          record.workload,
          record.estimated_hours != null ? `${record.estimated_hours} 小时` : null,
        ]
          .filter(Boolean)
          .join('，')
        const text = meta ? `${record.work_content}（${meta}）` : record.work_content
        lines.push(toBullet(markKey(record, text)))
      })
      lines.push('')
    })
  } else {
    groupByType(records).forEach((group) => {
      const keyCount = group.records.filter((record) => record.is_key).length
      const keySuffix = keyCount > 0 ? `，含重点 ${keyCount} 项` : ''
      lines.push(
        `**${group.type}（${group.records.length} 项，${formatHours(group.hours)} 小时${keySuffix}）**`,
      )
      group.records.forEach((record) => {
        lines.push(toBullet(markKey(record, `【${record.project_name}】${record.work_content}`)))
      })
      lines.push('')
    })
  }

  return `${lines.join('\n')}\n`
}

function renderProblems(records: WorkRecord[]): string {
  const problems = sortByPriority(
    records.filter((record) => record.work_type != null && PROBLEM_TYPES.includes(record.work_type)),
  )
  if (problems.length === 0) {
    return `## 三、问题与优化\n\n本周期无 Bug 修复类记录。\n`
  }
  const lines = ['## 三、问题与优化', '']
  problems.forEach((record) => {
    lines.push(toBullet(markKey(record, `【${record.project_name}】${record.work_content}`)))
  })
  return `${lines.join('\n')}\n`
}

function renderAccumulation(records: WorkRecord[]): string {
  const items = sortByPriority(
    records.filter(
      (record) => record.work_type != null && ACCUMULATION_TYPES.includes(record.work_type),
    ),
  )
  if (items.length === 0) {
    return `## 四、技术沉淀\n\n本周期暂无技术调研、代码评审类记录。\n`
  }
  const lines = ['## 四、技术沉淀', '']
  items.forEach((record) => {
    lines.push(
      toBullet(markKey(record, `【${record.work_type}·${record.project_name}】${record.work_content}`)),
    )
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
