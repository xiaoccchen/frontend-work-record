import dayjs from 'dayjs'
import type { ConfigType } from 'dayjs'

/** 日志日期格式：YYYY-MM-DD */
export function formatLogDate(date: ConfigType = new Date()): string {
  return dayjs(date).format('YYYY-MM-DD')
}

/** 时间戳格式：YYYY-MM-DD HH:mm:ss */
export function formatTimestamp(date: ConfigType = new Date()): string {
  return dayjs(date).format('YYYY-MM-DD HH:mm:ss')
}
