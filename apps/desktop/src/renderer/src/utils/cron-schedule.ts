import type { ComposerTranslation } from 'vue-i18n'

export interface CronRunPreview {
  absolute: string
  relative: string
  timestamp: number
}

type CronParserModule = typeof import('cron-parser')

let parserPromise: Promise<CronParserModule> | null = null

async function loadCronParser(): Promise<CronParserModule> {
  if (!parserPromise) {
    parserPromise = import('cron-parser')
  }
  return parserPromise
}

function formatAbsolute(date: Date, includeSeconds: boolean): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const seconds = String(date.getSeconds()).padStart(2, '0')
  return includeSeconds
    ? `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
    : `${year}-${month}-${day} ${hours}:${minutes}`
}

export function formatRelativeRunTime(target: Date, now = new Date()): string {
  const diffMs = target.getTime() - now.getTime()
  if (diffMs < 0) return '已过期'
  const seconds = Math.floor(diffMs / 1000)
  if (seconds < 60) return `${seconds} 秒后`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes} 分钟后`
  const hours = Math.floor(minutes / 60)
  if (hours < 48) return `${hours} 小时后`
  const days = Math.floor(hours / 24)
  return `约 ${days} 天后`
}

export async function getCronNextRuns(
  expression: string,
  options: { count?: number; includeSeconds?: boolean } = {}
): Promise<{ runs: CronRunPreview[] } | { error: string }> {
  const count = options.count ?? 5
  const includeSeconds = options.includeSeconds ?? true
  const parts = expression.trim().split(/\s+/)

  if (parts.length < 5 || parts.length > 6) {
    return { error: '无效的 Cron 表达式' }
  }

  try {
    const { CronExpressionParser } = await loadCronParser()
    const interval = CronExpressionParser.parse(expression, { currentDate: new Date() })
    const now = new Date()
    const runs: CronRunPreview[] = []

    for (let i = 0; i < count; i++) {
      const nextDate = interval.next().toDate()
      runs.push({
        absolute: formatAbsolute(nextDate, includeSeconds),
        relative: formatRelativeRunTime(nextDate, now),
        timestamp: nextDate.getTime()
      })
    }

    return { runs }
  } catch {
    return { error: '无效的 Cron 表达式' }
  }
}

function resolveDescribeKey(expression: string, includeSeconds: boolean): string {
  const parts = expression.trim().split(/\s+/)
  const len = parts.length

  if (len === 6 && includeSeconds) {
    const [second, minute, hour, day, month, week] = parts
    if (second === '*' && minute === '*' && hour === '*' && day === '*' && month === '*' && week === '*') {
      return 'everySecond'
    }
    if (second === '0' && minute === '0' && hour === '9' && day === '*' && month === '*' && week === '*') {
      return 'dailyAt9'
    }
    if (second === '0' && minute === '0' && hour === '0' && day === '*' && month === '*' && week === '*') {
      return 'dailyMidnight'
    }
    if (second === '0' && minute === '0' && hour === '0' && day === '*' && month === '*' && week === '1') {
      return 'weeklyMonday'
    }
  } else if (len === 5) {
    const [minute, hour, day, month, week] = parts
    if (minute === '0' && hour === '9' && day === '*' && month === '*' && week === '*') {
      return 'dailyAt9'
    }
    if (minute === '0' && hour === '0' && day === '*' && month === '*' && week === '*') {
      return 'dailyMidnight'
    }
    if (minute === '0' && hour === '0' && day === '*' && month === '*' && week === '1') {
      return 'weeklyMonday'
    }
  }

  return 'custom'
}

export function describeCronExpression(expression: string, includeSeconds: boolean): string {
  const key = resolveDescribeKey(expression, includeSeconds)
  const map: Record<string, string> = {
    everySecond: '每秒执行一次',
    dailyAt9: '每天上午 9:00 执行',
    dailyMidnight: '每天午夜执行',
    weeklyMonday: '每周一凌晨执行',
    custom: '自定义定时任务'
  }
  return map[key] ?? map.custom
}

export function describeCronExpressionI18n(
  expression: string,
  includeSeconds: boolean,
  t: ComposerTranslation
): string {
  const key = resolveDescribeKey(expression, includeSeconds)
  return t(`tools.cronParser.describe.${key}`)
}
