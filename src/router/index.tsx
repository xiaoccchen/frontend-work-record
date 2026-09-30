import { createBrowserRouter, Navigate } from 'react-router-dom'
import MainLayout from '@/components/MainLayout'
import RecordPage from '@/pages/RecordPage'
import RecordsPage from '@/pages/RecordsPage'
import SettingsPage from '@/pages/SettingsPage'
import SummaryPage from '@/pages/SummaryPage'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <MainLayout />,
    children: [
      { index: true, element: <Navigate to="/record" replace /> },
      { path: 'record', element: <RecordPage /> },
      { path: 'records', element: <RecordsPage /> },
      { path: 'summary', element: <SummaryPage /> },
      { path: 'settings', element: <SettingsPage /> },
      { path: '*', element: <Navigate to="/record" replace /> },
    ],
  },
])
