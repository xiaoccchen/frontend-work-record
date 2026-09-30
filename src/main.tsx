import { App as AntdApp, ConfigProvider } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import dayjs from 'dayjs'
import 'dayjs/locale/zh-cn'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'
import { useProjectStore } from '@/store/projectStore'
import { useRecordStore } from '@/store/recordStore'
import { useSummaryStore } from '@/store/summaryStore'

dayjs.locale('zh-cn')

const rootElement = document.getElementById('root')
if (!rootElement) {
  throw new Error('未找到 #root 挂载节点')
}
const root = createRoot(rootElement)

/** 先从存储层（SQLite / localStorage）载入数据，再渲染，避免首屏闪空 */
async function bootstrap() {
  try {
    await Promise.all([
      useRecordStore.getState().hydrate(),
      useSummaryStore.getState().hydrate(),
      useProjectStore.getState().hydrate(),
    ])
  } catch (error) {
    console.error('数据载入失败', error)
  }

  root.render(
    <StrictMode>
      <ConfigProvider locale={zhCN} theme={{ token: { colorPrimary: '#4a6b8a' } }}>
        <AntdApp>
          <App />
        </AntdApp>
      </ConfigProvider>
    </StrictMode>,
  )
}

void bootstrap()
