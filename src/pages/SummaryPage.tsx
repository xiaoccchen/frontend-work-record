import { Card, List, Typography } from 'antd'
import PageHeader from '@/components/PageHeader'

const PLANNED_FEATURES = [
  '按自然月 / 季度 / 自定义时间段聚合日志',
  '按工作类型分类汇总，突出重点工作与成果',
  '生成可在线编辑的总结内容',
  '导出 TXT / Markdown / Word',
]

export default function SummaryPage() {
  return (
    <>
      <PageHeader title="总结生成" description="聚合周期内工作数据，一键生成工作汇报" />
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
