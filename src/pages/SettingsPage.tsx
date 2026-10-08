import {
  DeleteOutlined,
  DownloadOutlined,
  EditOutlined,
  PlusOutlined,
  UploadOutlined,
} from '@ant-design/icons'
import {
  Alert,
  App,
  Button,
  Card,
  Descriptions,
  Form,
  Input,
  Modal,
  Popconfirm,
  Space,
  Switch,
  Table,
  TimePicker,
  Typography,
  Upload,
} from 'antd'
import type { TableColumnsType } from 'antd'
import dayjs, { type Dayjs } from 'dayjs'
import { useMemo, useState } from 'react'
import PageHeader from '@/components/PageHeader'
import { dataRepository, isDesktop } from '@/services/repositories'
import { useProjectStore } from '@/store/projectStore'
import { useQuickPhraseStore } from '@/store/quickPhraseStore'
import { useRecordStore } from '@/store/recordStore'
import { useSettingsStore } from '@/store/settingsStore'
import { useSummaryStore } from '@/store/summaryStore'
import type { BackupData, BackupFile, Project, ProjectDraft, QuickPhrase, QuickPhraseDraft } from '@/types'
import { DATA_SCHEMA_VERSION, DEFAULT_REMINDER_TIME, SETTING_KEYS } from '@/utils/constants'
import { formatLogDate, formatTimestamp } from '@/utils/date'
import { downloadTextFile } from '@/utils/download'
import { getErrorMessage } from '@/utils/error'

/** 覆盖前先刷新各仓库的内存态，保证页面数据与存储层一致 */
async function refreshAllStores(): Promise<void> {
  await Promise.all([
    useRecordStore.getState().hydrate(),
    useSummaryStore.getState().hydrate(),
    useProjectStore.getState().hydrate(),
    useQuickPhraseStore.getState().hydrate(),
    useSettingsStore.getState().hydrate(),
  ])
}

function parseBackup(text: string): BackupData {
  const raw: unknown = JSON.parse(text)
  if (typeof raw !== 'object' || raw === null) {
    throw new Error('备份文件格式不正确')
  }
  const data = raw as Partial<BackupFile>
  if (data.app !== 'frontend-work-record') {
    throw new Error('不是本工具导出的备份文件')
  }
  if (!Array.isArray(data.records) || !Array.isArray(data.summaries) || !Array.isArray(data.projects)) {
    throw new Error('备份文件缺少必要数据')
  }
  return {
    records: data.records,
    summaries: data.summaries,
    projects: data.projects,
    // schemaVersion 1 的旧备份没有这两张表，按空数据兼容
    phrases: Array.isArray(data.phrases) ? data.phrases : [],
    settings: Array.isArray(data.settings) ? data.settings : [],
  }
}

function ProjectDictionaryCard() {
  const { message } = App.useApp()
  const projects = useProjectStore((state) => state.projects)
  const addProject = useProjectStore((state) => state.addProject)
  const updateProject = useProjectStore((state) => state.updateProject)
  const removeProject = useProjectStore((state) => state.removeProject)
  const records = useRecordStore((state) => state.records)

  const [form] = Form.useForm<ProjectDraft>()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Project | null>(null)
  const [saving, setSaving] = useState(false)

  const usageCount = useMemo(() => {
    const counter = new Map<string, number>()
    records.forEach((item) => {
      counter.set(item.project_name, (counter.get(item.project_name) ?? 0) + 1)
    })
    return counter
  }, [records])

  const openCreate = () => {
    setEditing(null)
    form.resetFields()
    setModalOpen(true)
  }

  const openEdit = (project: Project) => {
    setEditing(project)
    form.setFieldsValue({ name: project.name, description: project.description ?? '' })
    setModalOpen(true)
  }

  const handleSubmit = async () => {
    let values: ProjectDraft
    try {
      values = await form.validateFields()
    } catch {
      return
    }

    const draft: ProjectDraft = {
      name: values.name.trim(),
      description: values.description?.trim() || null,
    }

    setSaving(true)
    try {
      if (editing) {
        await updateProject(editing.id, draft)
        message.success('项目已更新')
      } else {
        await addProject(draft)
        message.success('项目已新增')
      }
      setModalOpen(false)
    } catch (error) {
      message.error(getErrorMessage(error))
    } finally {
      setSaving(false)
    }
  }

  const handleRemove = async (project: Project) => {
    try {
      await removeProject(project.id)
      message.success('项目已删除')
    } catch (error) {
      message.error(getErrorMessage(error))
    }
  }

  const columns: TableColumnsType<Project> = [
    { title: '项目名称', dataIndex: 'name' },
    {
      title: '项目描述',
      dataIndex: 'description',
      render: (value: string | null) => value || <Typography.Text type="secondary">—</Typography.Text>,
    },
    {
      title: '相关日志',
      key: 'usage',
      width: 100,
      render: (_, project) => `${usageCount.get(project.name) ?? 0} 条`,
    },
    { title: '创建时间', dataIndex: 'created_at', width: 180 },
    {
      title: '操作',
      key: 'action',
      width: 140,
      render: (_, project) => (
        <Space size="small">
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openEdit(project)}>
            编辑
          </Button>
          <Popconfirm
            title="删除该项目？"
            description={
              usageCount.get(project.name)
                ? '已有日志使用该名称，删除字典项不会影响这些日志。'
                : '删除后不影响已录入的日志。'
            }
            okText="删除"
            cancelText="取消"
            okButtonProps={{ danger: true }}
            onConfirm={() => handleRemove(project)}
          >
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <Card
      title="项目字典"
      extra={
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          新增项目
        </Button>
      }
    >
      <Table<Project>
        rowKey="id"
        size="small"
        columns={columns}
        dataSource={projects}
        pagination={false}
        locale={{ emptyText: '暂无项目，新增后可在「工作录入」中直接选择' }}
      />
      <Modal
        title={editing ? '编辑项目' : '新增项目'}
        open={modalOpen}
        confirmLoading={saving}
        forceRender
        okText="保存"
        cancelText="取消"
        onOk={handleSubmit}
        onCancel={() => setModalOpen(false)}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="name"
            label="项目名称"
            rules={[{ required: true, message: '请输入项目名称' }]}
          >
            <Input placeholder="如：内部管理后台" maxLength={50} />
          </Form.Item>
          <Form.Item name="description" label="项目描述">
            <Input.TextArea rows={2} maxLength={100} placeholder="可选，简单说明项目用途" />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  )
}

function QuickPhraseCard() {
  const { message } = App.useApp()
  const phrases = useQuickPhraseStore((state) => state.phrases)
  const addPhrase = useQuickPhraseStore((state) => state.addPhrase)
  const updatePhrase = useQuickPhraseStore((state) => state.updatePhrase)
  const removePhrase = useQuickPhraseStore((state) => state.removePhrase)

  const [form] = Form.useForm<QuickPhraseDraft>()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<QuickPhrase | null>(null)
  const [saving, setSaving] = useState(false)

  const openCreate = () => {
    setEditing(null)
    form.resetFields()
    setModalOpen(true)
  }

  const openEdit = (phrase: QuickPhrase) => {
    setEditing(phrase)
    form.setFieldsValue({ content: phrase.content })
    setModalOpen(true)
  }

  const handleSubmit = async () => {
    let values: QuickPhraseDraft
    try {
      values = await form.validateFields()
    } catch {
      return
    }

    const draft: QuickPhraseDraft = { content: values.content.trim() }

    setSaving(true)
    try {
      if (editing) {
        await updatePhrase(editing.id, draft)
        message.success('快捷短语已更新')
      } else {
        await addPhrase(draft)
        message.success('快捷短语已新增')
      }
      setModalOpen(false)
    } catch (error) {
      message.error(getErrorMessage(error))
    } finally {
      setSaving(false)
    }
  }

  const handleRemove = async (phrase: QuickPhrase) => {
    try {
      await removePhrase(phrase.id)
      message.success('快捷短语已删除')
    } catch (error) {
      message.error(getErrorMessage(error))
    }
  }

  const columns: TableColumnsType<QuickPhrase> = [
    { title: '短语内容', dataIndex: 'content' },
    { title: '创建时间', dataIndex: 'created_at', width: 180 },
    {
      title: '操作',
      key: 'action',
      width: 140,
      render: (_, phrase) => (
        <Space size="small">
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openEdit(phrase)}>
            编辑
          </Button>
          <Popconfirm
            title="删除该快捷短语？"
            description="删除后在「工作录入」中不再出现。"
            okText="删除"
            cancelText="取消"
            okButtonProps={{ danger: true }}
            onConfirm={() => handleRemove(phrase)}
          >
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <Card
      title="快捷短语"
      extra={
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          新增短语
        </Button>
      }
    >
      <Table<QuickPhrase>
        rowKey="id"
        size="small"
        columns={columns}
        dataSource={phrases}
        pagination={false}
        locale={{ emptyText: '暂无快捷短语，新增后可在「工作录入」一键填充' }}
      />
      <Modal
        title={editing ? '编辑快捷短语' : '新增快捷短语'}
        open={modalOpen}
        confirmLoading={saving}
        forceRender
        okText="保存"
        cancelText="取消"
        onOk={handleSubmit}
        onCancel={() => setModalOpen(false)}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="content"
            label="短语内容"
            rules={[{ required: true, message: '请输入短语内容' }]}
          >
            <Input.TextArea
              rows={3}
              maxLength={200}
              placeholder="如：优化页面加载性能，首屏渲染时间明显下降"
            />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  )
}

/** 'HH:mm' 字符串转成当天的时间值，TimePicker 需要 Dayjs */
function toTimeValue(time: string): Dayjs {
  const [hour, minute] = time.split(':').map(Number)
  return dayjs().hour(hour).minute(minute).second(0)
}

function ReminderCard() {
  const { message } = App.useApp()
  const settings = useSettingsStore((state) => state.settings)
  const setSetting = useSettingsStore((state) => state.setSetting)
  const [saving, setSaving] = useState(false)

  const enabled = settings[SETTING_KEYS.reminderEnabled] === 'true'
  const reminderTime = settings[SETTING_KEYS.reminderTime] ?? DEFAULT_REMINDER_TIME

  const handleToggle = async (checked: boolean) => {
    if (
      checked &&
      !isDesktop &&
      typeof Notification !== 'undefined' &&
      Notification.permission === 'default'
    ) {
      void Notification.requestPermission()
    }

    setSaving(true)
    try {
      await setSetting(SETTING_KEYS.reminderEnabled, String(checked))
      message.success(checked ? `已开启每日 ${reminderTime} 记录提醒` : '已关闭记录提醒')
    } catch (error) {
      message.error(getErrorMessage(error))
    } finally {
      setSaving(false)
    }
  }

  const handleTimeChange = async (value: Dayjs | null) => {
    if (!value) {
      return
    }
    const next = value.format('HH:mm')
    try {
      await setSetting(SETTING_KEYS.reminderTime, next)
      message.success(`提醒时间已调整为 ${next}`)
    } catch (error) {
      message.error(getErrorMessage(error))
    }
  }

  return (
    <Card title="记录提醒">
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <Switch checked={enabled} loading={saving} onChange={handleToggle} />
          <Typography.Text>
            每日固定时间提醒记录当天工作，通知形式为
            {isDesktop ? '系统通知' : '浏览器通知（首次开启需授权）'}
          </Typography.Text>
        </div>
        <div className="flex items-center gap-3">
          <Typography.Text type="secondary">提醒时间</Typography.Text>
          <TimePicker
            format="HH:mm"
            minuteStep={5}
            allowClear={false}
            disabled={!enabled}
            defaultValue={toTimeValue(reminderTime)}
            onChange={handleTimeChange}
          />
        </div>
        <Typography.Text type="secondary">
          同一天只提醒一次；点击通知可直接跳转到「工作录入」。
        </Typography.Text>
      </div>
    </Card>
  )
}

function DataManagementCard() {
  const { message, modal } = App.useApp()
  const records = useRecordStore((state) => state.records)
  const summaries = useSummaryStore((state) => state.summaries)
  const projects = useProjectStore((state) => state.projects)
  const phrases = useQuickPhraseStore((state) => state.phrases)
  const settings = useSettingsStore((state) => state.settings)

  const handleExport = () => {
    const payload: BackupFile = {
      app: 'frontend-work-record',
      schemaVersion: DATA_SCHEMA_VERSION,
      exportedAt: formatTimestamp(),
      records,
      summaries,
      projects,
      phrases,
      settings: Object.entries(settings).map(([key, value]) => ({ key, value })),
    }
    downloadTextFile(
      `work-record-backup-${formatLogDate()}.json`,
      JSON.stringify(payload, null, 2),
      'application/json;charset=utf-8',
    )
    message.success('备份已导出')
  }

  const handleRestore = async (file: File) => {
    let payload: BackupData
    try {
      payload = parseBackup(await file.text())
    } catch (error) {
      message.error(getErrorMessage(error))
      return
    }

    modal.confirm({
      title: '恢复备份',
      content: `将用备份中的 ${payload.records.length} 条日志、${payload.summaries.length} 份总结、${payload.projects.length} 个项目、${payload.phrases.length} 条快捷短语覆盖当前全部数据，且不可撤销。`,
      okText: '确认覆盖',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await dataRepository.replaceAll(payload)
          await refreshAllStores()
          message.success('备份已恢复')
        } catch (error) {
          message.error(getErrorMessage(error))
        }
      },
    })
  }

  const handleClearAll = () => {
    modal.confirm({
      title: '清空全部数据',
      content: '将删除全部日志、历史总结、项目字典与快捷短语，并重置提醒等设置，且不可撤销。建议先导出备份。',
      okText: '确认清空',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await dataRepository.clearAll()
          await refreshAllStores()
          message.success('数据已清空')
        } catch (error) {
          message.error(getErrorMessage(error))
        }
      },
    })
  }

  return (
    <Card title="数据管理">
      <div className="flex flex-col gap-4">
        <Descriptions column={1} size="small">
          <Descriptions.Item label="当前数据">
            {records.length} 条日志 · {summaries.length} 份总结 · {projects.length} 个项目 ·{' '}
            {phrases.length} 条快捷短语
          </Descriptions.Item>
          <Descriptions.Item label="存储方式">
            {isDesktop ? 'SQLite（桌面端本地数据库）' : 'localStorage（浏览器模式）'}
          </Descriptions.Item>
        </Descriptions>

        <Alert
          type="warning"
          showIcon
          message="恢复与清空会覆盖当前全部数据，操作前请先导出备份。"
        />

        <Space wrap>
          <Button icon={<DownloadOutlined />} onClick={handleExport}>
            导出备份
          </Button>
          <Upload
            accept=".json"
            showUploadList={false}
            beforeUpload={(file) => {
              void handleRestore(file)
              return false
            }}
          >
            <Button icon={<UploadOutlined />}>恢复备份</Button>
          </Upload>
          <Button danger icon={<DeleteOutlined />} onClick={handleClearAll}>
            清空全部数据
          </Button>
        </Space>
      </div>
    </Card>
  )
}

export default function SettingsPage() {
  return (
    <>
      <PageHeader title="设置" description="记录提醒、项目字典、快捷短语与数据管理" />
      <div className="flex flex-col gap-4">
        <ReminderCard />
        <ProjectDictionaryCard />
        <QuickPhraseCard />
        <DataManagementCard />
      </div>
    </>
  )
}
