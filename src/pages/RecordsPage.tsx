import { DeleteOutlined, EditOutlined, PlusOutlined, StarFilled } from '@ant-design/icons'
import {
  App,
  Button,
  Card,
  DatePicker,
  Empty,
  Input,
  Popconfirm,
  Select,
  Space,
  Tag,
  Typography,
} from 'antd'
import dayjs, { type Dayjs } from 'dayjs'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import PageHeader from '@/components/PageHeader'
import { useRecordStore } from '@/store/recordStore'
import type { WorkloadLevel, WorkType } from '@/types'
import { WORK_TYPES } from '@/utils/constants'

/** 工作量等级对应的标签配色 */
const WORKLOAD_COLORS: Record<WorkloadLevel, string> = {
  轻量: 'default',
  常规: 'blue',
  繁重: 'orange',
}

export default function RecordsPage() {
  const navigate = useNavigate()
  const { message } = App.useApp()
  const records = useRecordStore((state) => state.records)
  const removeRecord = useRecordStore((state) => state.removeRecord)

  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs] | null>(null)
  const [workType, setWorkType] = useState<WorkType | null>(null)
  const [keyOnly, setKeyOnly] = useState(false)
  const [keyword, setKeyword] = useState('')

  const filteredRecords = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase()

    return records
      .filter((record) => {
        if (dateRange) {
          const logDate = dayjs(record.log_date)
          if (logDate.isBefore(dateRange[0], 'day') || logDate.isAfter(dateRange[1], 'day')) {
            return false
          }
        }
        if (workType && record.work_type !== workType) {
          return false
        }
        if (keyOnly && !record.is_key) {
          return false
        }
        if (normalizedKeyword) {
          const haystack = [
            record.project_name,
            record.work_content,
            record.remark ?? '',
            record.tags.join(' '),
          ].join(' ')
          if (!haystack.toLowerCase().includes(normalizedKeyword)) {
            return false
          }
        }
        return true
      })
      .sort((a, b) =>
        a.log_date === b.log_date ? b.id - a.id : b.log_date.localeCompare(a.log_date),
      )
  }, [records, dateRange, workType, keyOnly, keyword])

  const handleDelete = async (id: number) => {
    await removeRecord(id)
    message.success('日志已删除')
  }

  return (
    <>
      <PageHeader
        title="日志管理"
        description={`共 ${records.length} 条日志，当前筛选出 ${filteredRecords.length} 条`}
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/record')}>
            新增日志
          </Button>
        }
      />

      <div className="flex flex-col gap-4">
        <Card>
          <div className="flex flex-wrap items-center gap-3">
            <DatePicker.RangePicker
              allowClear
              placeholder={['开始日期', '结束日期']}
              onChange={(values) =>
                setDateRange(values && values[0] && values[1] ? [values[0], values[1]] : null)
              }
            />
            <Select
              className="w-40"
              value={workType}
              allowClear
              placeholder="全部工作类型"
              options={WORK_TYPES.map((type) => ({ value: type, label: type }))}
              onChange={(value) => setWorkType(value ?? null)}
            />
            <Select
              className="w-36"
              value={keyOnly ? 'key' : 'all'}
              options={[
                { value: 'all', label: '全部日志' },
                { value: 'key', label: '仅重点工作' },
              ]}
              onChange={(value) => setKeyOnly(value === 'key')}
            />
            <Input.Search
              className="w-72"
              value={keyword}
              allowClear
              placeholder="搜索项目名称 / 工作内容 / 备注 / 标签"
              onChange={(event) => setKeyword(event.target.value)}
            />
          </div>
        </Card>

        {filteredRecords.length === 0 ? (
          <Card>
            <Empty
              description={records.length === 0 ? '还没有日志，先录入一条吧' : '没有符合条件的日志'}
            />
          </Card>
        ) : (
          <div className="flex flex-col gap-3">
            {filteredRecords.map((record) => (
              <Card key={record.id} size="small">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Typography.Text strong>{record.log_date}</Typography.Text>
                      {record.is_key && (
                        <Tag color="gold" icon={<StarFilled />}>
                          重点
                        </Tag>
                      )}
                      {record.work_type && <Tag color="blue">{record.work_type}</Tag>}
                      {record.workload && (
                        <Tag color={WORKLOAD_COLORS[record.workload]}>{record.workload}</Tag>
                      )}
                      <Tag>{record.project_name}</Tag>
                      {record.start_time && record.end_time && (
                        <Typography.Text type="secondary">
                          {record.start_time} - {record.end_time}
                        </Typography.Text>
                      )}
                      {record.estimated_hours != null && (
                        <Typography.Text type="secondary">
                          预估 {record.estimated_hours} 小时
                        </Typography.Text>
                      )}
                      {record.tags.map((tag) => (
                        <Tag key={tag} color="geekblue" bordered={false}>
                          #{tag}
                        </Tag>
                      ))}
                    </div>
                    <Typography.Paragraph className="!mt-2 !mb-0 whitespace-pre-wrap">
                      {record.work_content}
                    </Typography.Paragraph>
                    {record.remark && (
                      <Typography.Text type="secondary">备注：{record.remark}</Typography.Text>
                    )}
                  </div>
                  <Space>
                    <Button
                      type="link"
                      size="small"
                      icon={<EditOutlined />}
                      onClick={() => navigate(`/record?id=${record.id}`)}
                    >
                      编辑
                    </Button>
                    <Popconfirm
                      title="确认删除这条日志？"
                      description="删除后不可恢复"
                      okText="删除"
                      cancelText="取消"
                      onConfirm={() => handleDelete(record.id)}
                    >
                      <Button type="link" size="small" danger icon={<DeleteOutlined />}>
                        删除
                      </Button>
                    </Popconfirm>
                  </Space>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
