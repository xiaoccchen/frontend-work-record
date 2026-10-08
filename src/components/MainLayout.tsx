import {
  EditOutlined,
  FileTextOutlined,
  SettingOutlined,
  UnorderedListOutlined,
} from '@ant-design/icons'
import { Layout, Menu } from 'antd'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useDailyReminder } from '@/hooks/useDailyReminder'

const { Sider, Content } = Layout

const MENU_ITEMS = [
  { key: '/record', icon: <EditOutlined />, label: '工作录入' },
  { key: '/records', icon: <UnorderedListOutlined />, label: '日志管理' },
  { key: '/summary', icon: <FileTextOutlined />, label: '总结生成' },
  { key: '/settings', icon: <SettingOutlined />, label: '设置' },
]

/** 左侧功能导航 + 右侧主内容区 */
export default function MainLayout() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  useDailyReminder()

  return (
    <Layout className="h-screen">
      <Sider theme="light" width={200} className="border-r border-slate-200">
        <div className="flex h-14 items-center px-4 text-base font-semibold text-slate-700">
          前端工作日志
        </div>
        <Menu
          mode="inline"
          selectedKeys={[pathname]}
          items={MENU_ITEMS}
          onClick={({ key }) => navigate(key)}
          className="border-r-0"
        />
      </Sider>
      <Layout>
        <Content className="overflow-auto bg-slate-50 p-6">
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  )
}
