import { SaveOutlined } from '@ant-design/icons'
import {
  Alert,
  App,
  AutoComplete,
  Button,
  Card,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Select,
  Space,
  TimePicker,
} from 'antd'
import dayjs, { type Dayjs } from 'dayjs'
import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import PageHeader from '@/components/PageHeader'
import { useAppStore } from '@/store/appStore'
import { useRecordStore } from '@/store/recordStore'
import type { WorkRecord, WorkRecordDraft, WorkType } from '@/types'
import { WORK_TYPES } from '@/utils/constants'
import { formatLogDate } from '@/utils/date'

const { RangePicker } = TimePicker

/** 表单值：日期与时间使用 Dayjs，提交时再转换为字符串存储 */
interface RecordFormValues {
  log_date: Dayjs
  time_range?: [Dayjs, Dayjs]
  project_name: string
  work_type: WorkType | null
  work_content: string
  estimated_hours: number | null
  remark: string | null
}

function toFormValues(record: WorkRecordDraft): RecordFormValues {
  return {
    log_date: dayjs(record.log_date),
    time_range:
      record.start_time && record.end_time
        ? [dayjs(record.start_time, 'HH:mm'), dayjs(record.end_time, 'HH:mm')]
        : undefined,
    project_name: record.project_name,
    work_type: record.work_type,
    work_content: record.work_content,
    estimated_hours: record.estimated_hours,
    remark: record.remark,
  }
}

function toDraft(values: RecordFormValues): WorkRecordDraft {
  return {
    log_date: formatLogDate(values.log_date),
    start_time: values.time_range?.[0]?.format('HH:mm') ?? null,
    end_time: values.time_range?.[1]?.format('HH:mm') ?? null,
    project_name: (values.project_name ?? '').trim(),
    work_type: values.work_type ?? null,
    work_content: (values.work_content ?? '').trim(),
    estimated_hours: values.estimated_hours ?? null,
    remark: values.remark?.trim() || null,
  }
}

interface RecordFormProps {
  /** 传入表示编辑已有日志，不传为新增 */
  record?: WorkRecord
}

function RecordForm({ record }: RecordFormProps) {
  const [form] = Form.useForm<RecordFormValues>()
  const { message } = App.useApp()
  const navigate = useNavigate()
  const records = useRecordStore((state) => state.records)
  const addRecord = useRecordStore((state) => state.addRecord)
  const updateRecord = useRecordStore((state) => state.updateRecord)
  const draft = useAppStore((state) => state.draft)
  const setDraft = useAppStore((state) => state.setDraft)
  const resetDraft = useAppStore((state) => state.resetDraft)
  // 仅在挂载时读取一次草稿/日志，避免受后续输入影响
  const [initialValues] = useState(() => toFormValues(record ?? draft))

  const logDate = Form.useWatch('log_date', form) ?? initialValues.log_date
  const sameDateCount = records.filter(
    (item) => item.log_date === formatLogDate(logDate) && item.id !== record?.id,
  ).length

  const projectOptions = useMemo(
    () =>
      Array.from(new Set(records.map((item) => item.project_name)))
        .filter(Boolean)
        .map((name) => ({ value: name })),
    [records],
  )

  const handleFinish = (values: RecordFormValues) => {
    const data = toDraft(values)

    if (record) {
      updateRecord(record.id, data)
      message.success('日志已更新')
      navigate('/records')
      return
    }

    addRecord(data)
    message.success('日志已保存')
    // 保留刚保存的日期，方便同一天继续补录
    resetDraft(data.log_date)
    form.setFieldsValue({
      time_range: undefined,
      project_name: '',
      work_type: null,
      work_content: '',
      estimated_hours: null,
      remark: null,
    })
  }

  return (
    <>
      {sameDateCount > 0 && (
        <Alert
          type="info"
          showIcon
          className="mb-4"
          message={`${formatLogDate(logDate)} 已录入 ${sameDateCount} 条日志`}
          description="同日多条工作可直接继续录入；需要修改请到「日志管理」中编辑。"
        />
      )}
      <Form
        form={form}
        layout="vertical"
        initialValues={initialValues}
        onValuesChange={(_, values) => {
          if (!record) {
            setDraft(toDraft(values))
          }
        }}
        onFinish={handleFinish}
      >
        <div className="grid grid-cols-1 gap-x-4 md:grid-cols-2">
          <Form.Item
            name="log_date"
            label="工作日期"
            rules={[{ required: true, message: '请选择工作日期' }]}
          >
            <DatePicker className="w-full" allowClear={false} />
          </Form.Item>
          <Form.Item name="time_range" label="起止时间">
            <RangePicker className="w-full" format="HH:mm" />
          </Form.Item>
          <Form.Item
            name="project_name"
            label="项目名称"
            rules={[{ required: true, message: '请输入项目名称' }]}
          >
            <AutoComplete
              options={projectOptions}
              placeholder="输入项目名称，或从已用项目中选择"
            />
          </Form.Item>
          <Form.Item name="work_type" label="工作类型">
            <Select
              allowClear
              placeholder="请选择工作类型"
              options={WORK_TYPES.map((type) => ({ value: type, label: type }))}
            />
          </Form.Item>
        </div>

        <Form.Item
          name="work_content"
          label="工作内容"
          rules={[{ required: true, message: '请输入工作内容' }]}
        >
          <Input.TextArea rows={5} placeholder="填写具体需求、页面模块、修复的问题、优化点等，支持换行" />
        </Form.Item>

        <div className="grid grid-cols-1 gap-x-4 md:grid-cols-2">
          <Form.Item name="estimated_hours" label="预估工时（小时）">
            <InputNumber className="w-full" min={0} max={24} step={0.5} placeholder="例如 2.5" />
          </Form.Item>
          <Form.Item name="remark" label="备注">
            <Input.TextArea rows={1} autoSize={{ minRows: 1, maxRows: 4 }} placeholder="阻塞问题、待跟进事项等" />
          </Form.Item>
        </div>

        <Space>
          <Button type="primary" htmlType="submit" icon={<SaveOutlined />}>
            {record ? '保存修改' : '保存日志'}
          </Button>
          {record && <Button onClick={() => navigate('/records')}>取消</Button>}
        </Space>
      </Form>
    </>
  )
}

export default function RecordPage() {
  const [searchParams] = useSearchParams()
  const editId = Number(searchParams.get('id')) || 0
  const editingRecord = useRecordStore((state) =>
    editId ? state.records.find((item) => item.id === editId) : undefined,
  )

  return (
    <>
      <PageHeader
        title={editingRecord ? '编辑日志' : '工作录入'}
        description={
          editingRecord
            ? `正在修改 ${editingRecord.log_date} 的日志记录`
            : '默认选中当日日期，输入内容自动保存草稿'
        }
      />
      <Card>
        <RecordForm key={editId || 'new'} record={editingRecord} />
      </Card>
    </>
  )
}
