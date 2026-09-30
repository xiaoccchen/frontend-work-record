import dayjs from 'dayjs'
import type { ConfigType } from 'dayjs'
import type { Period } from '@/types'

/** 日志日期格式：YYYY-MM-DD */
export function formatLogDate(date: ConfigType = new Date()): string {
  return dayjs(date).format('YYYY-MM-DD')
}

/** 时间戳格式：YYYY-MM-DD HH:mm:ss */
export function formatTimestamp(date: ConfigType = new Date()): string {
  return dayjs(date).format('YYYY-MM-DD HH:mm:ss')
}

/** 指定日期所在自然月的区间 */
export function getMonthRange(month: ConfigType): Period {
  const firstDay = dayjs(month).startOf('month')
  return {
    start: firstDay.format('YYYY-MM-DD'),
    end: firstDay.endOf('month').format('YYYY-MM-DD'),
  }
}

/** 指定年、季度的区间，quarter 取值 1-4 */
export function getQuarterRange(year: number, quarter: number): Period {
  const firstDay = dayjs(`${year}-${String((quarter - 1) * 3 + 1).padStart(2, '0')}-01`)
  return {
    start: firstDay.format('YYYY-MM-DD'),
    end: firstDay.add(3, 'month').subtract(1, 'day').format('YYYY-MM-DD'),
  }
}

/** 当前季度，1-4 */
export function getCurrentQuarter(): number {
  return Math.floor(dayjs().month() / 3) + 1
}
