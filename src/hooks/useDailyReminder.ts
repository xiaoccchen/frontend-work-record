import dayjs from 'dayjs'
import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { isDesktop } from '@/services/repositories'
import { useSettingsStore } from '@/store/settingsStore'
import { DEFAULT_REMINDER_TIME, SETTING_KEYS } from '@/utils/constants'

/** 轮询间隔，分钟级误差足够 */
const CHECK_INTERVAL_MS = 30_000

const NOTIFICATION_TITLE = '该记录今天的工作了'
const NOTIFICATION_BODY = '点击填写今天的工作日志。'

/**
 * 每日记录提醒：到达设定时间且当日尚未提醒过时弹一次通知，点击跳到「工作录入」。
 * 设置项读写走 settingsStore（落 SQLite / localStorage），这里只做轮询与触发。
 */
export function useDailyReminder(): void {
  const navigate = useNavigate()
  const settings = useSettingsStore((state) => state.settings)

  // 用 ref 持有最新值，避免设置变化导致轮询定时器重建
  const settingsRef = useRef(settings)
  settingsRef.current = settings
  const navigateRef = useRef(navigate)
  navigateRef.current = navigate
  /** 本次会话已触发的日期，兜住 store 回写尚未生效时的重复触发 */
  const firedRef = useRef<string | null>(null)

  // 桌面端通知的点击跳转由主进程回传路径
  useEffect(() => {
    window.api?.app.onNavigate((path) => navigateRef.current(path))
  }, [])

  useEffect(() => {
    const check = () => {
      const current = settingsRef.current
      if (current[SETTING_KEYS.reminderEnabled] !== 'true') {
        return
      }

      const now = dayjs()
      const today = now.format('YYYY-MM-DD')
      const reminderTime = current[SETTING_KEYS.reminderTime] ?? DEFAULT_REMINDER_TIME

      if (firedRef.current === today || current[SETTING_KEYS.reminderLastFiredDate] === today) {
        return
      }
      if (now.format('HH:mm') < reminderTime) {
        return
      }

      firedRef.current = today
      // 先落库占位，避免重启后当日重复提醒
      void useSettingsStore.getState().setSetting(SETTING_KEYS.reminderLastFiredDate, today)
      showReminder(navigateRef.current)
    }

    check()
    const timer = window.setInterval(check, CHECK_INTERVAL_MS)
    return () => window.clearInterval(timer)
  }, [])
}

/** 桌面端交给主进程弹系统通知，浏览器回退 Notification API */
function showReminder(navigate: (path: string) => void): void {
  if (isDesktop) {
    void window.api?.app.notify(NOTIFICATION_TITLE, NOTIFICATION_BODY)
    return
  }

  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') {
    return
  }

  const notification = new Notification(NOTIFICATION_TITLE, { body: NOTIFICATION_BODY })
  notification.onclick = () => {
    window.focus()
    navigate('/record')
  }
}
