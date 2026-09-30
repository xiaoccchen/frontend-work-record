import { Card, List, Typography } from 'antd'
import PageHeader from '@/components/PageHeader'

const PLANNED_FEATURES = [
  '项目字典维护',
  '数据备份导出 / 备份恢复',
  '清空全部数据（含二次确认）',
  '关于本工具',
]

export default function SettingsPage() {
  return (
    <>
      <PageHeader title="设置" description="数据管理与基础配置" />
      <Card>
        <List
          size="small"
          header={<Typography.Text type="secondary">规划中的功能</Typography.Text>}
          dataSource={PLANNED_FEATURES}
          renderItem={(item) => <List.Item>{item}</List.Item>}
        />
      </Card>
    </>
  )
}
