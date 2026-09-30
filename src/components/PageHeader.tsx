import { Typography } from 'antd'
import type { ReactNode } from 'react'

interface PageHeaderProps {
  title: string
  description?: string
  extra?: ReactNode
}

/** 页面通用标题区，统一各页面顶部信息层级 */
export default function PageHeader({ title, description, extra }: PageHeaderProps) {
  return (
    <div className="mb-4 flex items-start justify-between gap-4">
      <div>
        <Typography.Title level={4} className="!mb-1">
          {title}
        </Typography.Title>
        {description && <Typography.Text type="secondary">{description}</Typography.Text>}
      </div>
      {extra}
    </div>
  )
}
