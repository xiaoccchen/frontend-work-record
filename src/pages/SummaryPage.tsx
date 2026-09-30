import {
  DeleteOutlined,
  DownloadOutlined,
  FileTextOutlined,
  HistoryOutlined,
  SaveOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons'
import {
  App,
  Button,
  Card,
  DatePicker,
  Empty,
  Input,
  List,
  Popconfirm,
  Radio,
  Segmented,
  Select,
  Space,
  Tag,
  Typography,
} from 'antd'
import dayjs, { type Dayjs } from 'dayjs'
import { useMemo, useState } from 'react'
import PageHeader from '@/components/PageHeader'
import { useRecordStore } from '@/store/recordStore'
import { useSummaryStore } from '@/store/summaryStore'
import type { Period, SummaryTemplateId, WorkSummary } from '@/types'
import { SUMMARY_TEMPLATES } from '@/utils/constants'
import { formatLogDate, getCurrentQuarter, getMonthRange, getQuarterRange } from '@/utils/date'
import { downloadTextFile } from '@/utils/download'
import { buildSummaryContent, summaryToPlainText } from '@/utils/summary'

type PeriodType = 'month' | 'quarter' | 'custom'
type RangeValue = [Dayjs, Dayjs] | null

const QUARTER_OPTIONS = [1, 2, 3, 4].map((quarter) => ({
  value: quarter,
  label: `第 ${quarter} 季度`,
}))

function templateName(id: SummaryTemplateId): string {
  return SUMMARY_TEMPLATES.find((template) => template.id === id)?.name ?? id
}

export default function SummaryPage() {
  const { message } = App.useApp()
  const records = useRecordStore((state) => state.records)
  const summaries = useSummaryStore((state) => state.summaries)
  const saveSummary = useSummaryStore((state) => state.saveSummary)
  const updateSummary = useSummaryStore((state) => state.updateSummary)
  const removeSummary = useSummaryStore((state) => state.removeSummary)

  const [periodType, setPeriodType] = useState<PeriodType>('month')
  const [month, setMonth] = useState<Dayjs>(dayjs())
  const [year, setYear] = useState<number>(dayjs().year())
  const [quarter, setQuarter] = useState<number>(getCurrentQuarter())
  const [customRange, setCustomRange] = useState<RangeValue>(null)
  const [templateId, setTemplateId] = useState<SummaryTemplateId>('standard')

  const [content, setContent] = useState('')
  /** 内容生成时使用的周期，保存与导出以它为准 */
  const [generatedPeriod, setGeneratedPeriod] = useState<Period | null>(null)
  const [editingId, setEditingId] = useState<number | null>(null)

  const activePeriod = useMemo<Period | null>(() => {
    if (periodType === 'month') {
      return getMonthRange(month)
    }
    if (periodType === 'quarter') {
      return getQuarterRange(year, quarter)
    }
    return customRange
      ? { start: formatLogDate(customRange[0]), end: formatLogDate(customRange[1]) }
      : null
  }, [periodType, month, year, quarter, customRange])

  const periodRecords = useMemo(() => {
    if (!activePeriod) {
      return []
    }
    return records
      .filter(
        (record) =>
          record.log_date >= activePeriod.start && record.log_date <= activePeriod.end,
      )
      .sort((a, b) =>
        a.log_date === b.log_date ? a.id - b.id : a.log_date.localeCompare(b.log_date),
      )
  }, [records, activePeriod])

  const yearOptions = useMemo(() => {
    const years = new Set(records.map((record) => Number(record.log_date.slice(0, 4))))
    years.add(dayjs().year())
    return [...years].sort((a, b) => b - a).map((item) => ({ value: item, label: `${item} 年` }))
  }, [records])

  const sortedSummaries = useMemo(
    () => [...summaries].sort((a, b) => b.id - a.id),
    [summaries],
  )

  const activeTemplate = SUMMARY_TEMPLATES.find((template) => template.id === templateId)

  const handleGenerate = () => {
    if (!activePeriod) {
      message.warning('请先选择完整的时间段')
      return
    }
    setContent(buildSummaryContent(periodRecords, activePeriod, templateId))
    setGeneratedPeriod(activePeriod)
    setEditingId(null)
    message.success(`已根据 ${periodRecords.length} 条日志生成总结`)
  }

  const handleSave = () => {
    if (!generatedPeriod) {
      message.warning('请先生成总结内容')
      return
    }
    if (!content.trim()) {
      message.warning('总结内容不能为空')
      return
    }

    const payload = {
      title: `${generatedPeriod.start} 至 ${generatedPeriod.end} 工作总结`,
      period_start: generatedPeriod.start,
      period_end: generatedPeriod.end,
      template: templateId,
      content,
    }

    if (editingId) {
      updateSummary(editingId, payload)
      message.success('历史总结已更新')
      return
    }

    const saved = saveSummary(payload)
    setEditingId(saved.id)
    message.success('总结已保存到历史记录')
  }

  const handleExport = (format: 'txt' | 'md') => {
    if (!content.trim()) {
      message.warning('暂无可导出的内容')
      return
    }
    const period = generatedPeriod ?? activePeriod
    const prefix = period ? `${period.start}_${period.end}` : '工作总结'
    // TXT 导出纯文本，Markdown 标记只在 Markdown 导出中保留
    const text = format === 'txt' ? summaryToPlainText(content) : content
    downloadTextFile(`${prefix}_工作总结.${format}`, text)
    message.success(`已导出 ${format.toUpperCase()} 文件`)
  }

  const handleLoad = (summary: WorkSummary) => {
    setContent(summary.content)
    setTemplateId(summary.template)
    setEditingId(summary.id)
    setGeneratedPeriod({ start: summary.period_start, end: summary.period_end })
    message.success('已载入历史总结')
  }

  const handleRemove = (id: number) => {
    removeSummary(id)
    if (editingId === id) {
      setEditingId(null)
    }
    message.success('历史总结已删除')
  }

  return (
    <>
      <PageHeader title="总结生成" description="聚合周期内工作日志，生成可编辑、可导出的工作总结" />

      <Card className="mb-4">
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <Segmented
              value={periodType}
              onChange={(value) => setPeriodType(value as PeriodType)}
              options={[
                { value: 'month', label: '按月' },
                { value: 'quarter', label: '按季度' },
                { value: 'custom', label: '自定义时间段' },
              ]}
            />
            {periodType === 'month' && (
              <DatePicker
                picker="month"
                value={month}
                allowClear={false}
                onChange={(value) => value && setMonth(value)}
              />
            )}
            {periodType === 'quarter' && (
              <Space>
                <Select className="w-28" value={year} options={yearOptions} onChange={setYear} />
                <Select
                  className="w-32"
                  value={quarter}
                  options={QUARTER_OPTIONS}
                  onChange={setQuarter}
                />
              </Space>
            )}
            {periodType === 'custom' && (
              <DatePicker.RangePicker
                allowClear
                placeholder={['开始日期', '结束日期']}
                onChange={(values) =>
                  setCustomRange(values && values[0] && values[1] ? [values[0], values[1]] : null)
                }
              />
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Radio.Group
              value={templateId}
              onChange={(event) => setTemplateId(event.target.value as SummaryTemplateId)}
              options={SUMMARY_TEMPLATES.map((template) => ({
                value: template.id,
                label: template.name,
              }))}
            />
            <Typography.Text type="secondary">{activeTemplate?.description}</Typography.Text>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button type="primary" icon={<ThunderboltOutlined />} onClick={handleGenerate}>
              生成总结
            </Button>
            <Typography.Text type="secondary">
              {activePeriod
                ? `统计周期 ${activePeriod.start} 至 ${activePeriod.end}，命中 ${periodRecords.length} 条日志`
                : '请选择完整的时间段'}
            </Typography.Text>
          </div>
        </div>
      </Card>

      <Card
        className="mb-4"
        title="总结内容"
        extra={
          editingId ? (
            <Tag color="blue">编辑历史总结 #{editingId}</Tag>
          ) : generatedPeriod ? (
            <Typography.Text type="secondary">
              {generatedPeriod.start} 至 {generatedPeriod.end} · {templateName(templateId)}
            </Typography.Text>
          ) : null
        }
      >
        <Input.TextArea
          value={content}
          rows={20}
          onChange={(event) => setContent(event.target.value)}
          placeholder="点击「生成总结」按周期自动聚合内容，生成后可直接在此修改"
        />
        <Space className="mt-4">
          <Button type="primary" icon={<SaveOutlined />} onClick={handleSave}>
            保存到历史
          </Button>
          <Button icon={<DownloadOutlined />} onClick={() => handleExport('txt')}>
            导出 TXT
          </Button>
          <Button icon={<DownloadOutlined />} onClick={() => handleExport('md')}>
            导出 Markdown
          </Button>
        </Space>
      </Card>

      <Card title={`历史总结（${summaries.length}）`}>
        {sortedSummaries.length === 0 ? (
          <Empty description="暂无历史总结，生成后可保存留存" />
        ) : (
          <List
            dataSource={sortedSummaries}
            renderItem={(summary) => (
              <List.Item
                actions={[
                  <Button
                    key="load"
                    type="link"
                    size="small"
                    icon={<FileTextOutlined />}
                    onClick={() => handleLoad(summary)}
                  >
                    载入
                  </Button>,
                  <Popconfirm
                    key="delete"
                    title="确认删除这条历史总结？"
                    description="删除后不可恢复"
                    okText="删除"
                    cancelText="取消"
                    onConfirm={() => handleRemove(summary.id)}
                  >
                    <Button type="link" size="small" danger icon={<DeleteOutlined />}>
                      删除
                    </Button>
                  </Popconfirm>,
                ]}
              >
                <List.Item.Meta
                  avatar={<HistoryOutlined className="mt-1 text-slate-400" />}
                  title={
                    <Space size={8}>
                      <span>{summary.title}</span>
                      <Tag>{templateName(summary.template)}</Tag>
                    </Space>
                  }
                  description={`更新于 ${summary.updated_at}`}
                />
              </List.Item>
            )}
          />
        )}
      </Card>
    </>
  )
}
