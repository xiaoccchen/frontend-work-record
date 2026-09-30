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
  Table,
  Typography,
  Upload,
} from 'antd'
import type { TableColumnsType } from 'antd'
import { useMemo, useState } from 'react'
import PageHeader from '@/components/PageHeader'
import { dataRepository, isDesktop } from '@/services/repositories'
import { useProjectStore } from '@/store/projectStore'
import { useRecordStore } from '@/store/recordStore'
import { useSummaryStore } from '@/store/summaryStore'
import type { BackupData, BackupFile, Project, ProjectDraft } from '@/types'
import { DATA_SCHEMA_VERSION } from '@/utils/constants'
import { formatLogDate, formatTimestamp } from '@/utils/date'
import { downloadTextFile } from '@/utils/download'
import { getErrorMessage } from '@/utils/error'

/** 覆盖前先刷新三个仓库的内存态，保证页面数据与存储层一致 */
async function refreshAllStores(): Promise<void> {
  await Promise.all([
    useRecordStore.getState().hydrate(),
    useSummaryStore.getState().hydrate(),
    useProjectStore.getState().hydrate(),
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
  return { records: data.records, summaries: data.summaries, projects: data.projects }
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

function DataManagementCard() {
  const { message, modal } = App.useApp()
  const records = useRecordStore((state) => state.records)
  const summaries = useSummaryStore((state) => state.summaries)
  const projects = useProjectStore((state) => state.projects)

  const handleExport = () => {
    const payload: BackupFile = {
      app: 'frontend-work-record',
      schemaVersion: DATA_SCHEMA_VERSION,
      exportedAt: formatTimestamp(),
      records,
      summaries,
      projects,
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
      content: `将用备份中的 ${payload.records.length} 条日志、${payload.summaries.length} 份总结、${payload.projects.length} 个项目覆盖当前全部数据，且不可撤销。`,
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
      content: '将删除全部日志、历史总结与项目字典，且不可撤销。建议先导出备份。',
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
            {records.length} 条日志 · {summaries.length} 份总结 · {projects.length} 个项目
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
      <PageHeader title="设置" description="项目字典与数据管理" />
      <div className="flex flex-col gap-4">
        <ProjectDictionaryCard />
        <DataManagementCard />
      </div>
    </>
  )
}
