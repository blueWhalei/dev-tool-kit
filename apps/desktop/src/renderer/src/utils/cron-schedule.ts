import type { ComposerTranslation } from 'vue-i18n'

export interface CronRunPreview {
  absolute: string
  relative: string
  timestamp: number
}

export type CronFieldKey = 'second' | 'minute' | 'hour' | 'day' | 'month' | 'week'

export type CronFieldPatternType = 'every' | 'step' | 'value' | 'range' | 'list' | 'custom'

export interface CronField {
  type: CronFieldPatternType
  value?: number
  start?: number
  end?: number
  step?: number
  values?: number[]
  raw?: string
}

export type CronFields = Record<CronFieldKey, CronField>

export interface CronFieldDef {
  key: CronFieldKey
  min: number
  max: number
}

export const CRON_FIELD_DEFS: Record<CronFieldKey, CronFieldDef> = {
  second: { key: 'second', min: 0, max: 59 },
  minute: { key: 'minute', min: 0, max: 59 },
  hour: { key: 'hour', min: 0, max: 23 },
  day: { key: 'day', min: 1, max: 31 },
  month: { key: 'month', min: 1, max: 12 },
  week: { key: 'week', min: 0, max: 6 }
}

const FIELD_ORDER_WITH_SECONDS: CronFieldKey[] = ['second', 'minute', 'hour', 'day', 'month', 'week']
const FIELD_ORDER_WITHOUT_SECONDS: CronFieldKey[] = ['minute', 'hour', 'day', 'month', 'week']

export const COMMON_TIMEZONES = [
  'UTC',
  'Asia/Shanghai',
  'Asia/Hong_Kong',
  'Asia/Taipei',
  'Asia/Tokyo',
  'Asia/Seoul',
  'Asia/Singapore',
  'Europe/London',
  'Europe/Berlin',
  'Europe/Paris',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'Australia/Sydney'
] as const

type CronParserModule = typeof import('cron-parser')

let parserPromise: Promise<CronParserModule> | null = null

async function loadCronParser(): Promise<CronParserModule> {
  if (!parserPromise) {
    parserPromise = import('cron-parser')
  }
  return parserPromise
}

export function getLocalTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone
}

export function getTimezoneOptions(localTimezone = getLocalTimezone()): string[] {
  const zones = new Set<string>(COMMON_TIMEZONES)
  zones.add(localTimezone)
  return Array.from(zones).sort((a, b) => {
    if (a === localTimezone) return -1
    if (b === localTimezone) return 1
    return a.localeCompare(b)
  })
}

export function formatAbsoluteInTimezone(
  date: Date,
  timezone: string,
  includeSeconds: boolean
): string {
  const options: Intl.DateTimeFormatOptions = {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }
  if (includeSeconds) {
    options.second = '2-digit'
  }
  return new Intl.DateTimeFormat('sv-SE', options).format(date)
}

function defaultCronField(): CronField {
  return { type: 'every' }
}

export function createDefaultCronFields(includeSeconds: boolean): CronFields {
  const fields = {
    second: defaultCronField(),
    minute: defaultCronField(),
    hour: defaultCronField(),
    day: defaultCronField(),
    month: defaultCronField(),
    week: defaultCronField()
  }
  if (includeSeconds) {
    fields.second = { type: 'value', value: 0 }
    fields.hour = { type: 'value', value: 9 }
  } else {
    fields.hour = { type: 'value', value: 9 }
  }
  fields.minute = { type: 'value', value: 0 }
  return fields
}

export function parseCronField(token: string): CronField {
  const trimmed = token.trim()
  if (!trimmed) return { type: 'custom', raw: token }

  if (trimmed === '*') return { type: 'every' }

  const everyStepMatch = trimmed.match(/^\*\/(\d+)$/)
  if (everyStepMatch) {
    return { type: 'step', step: Number(everyStepMatch[1]) }
  }

  const startStepMatch = trimmed.match(/^(\d+)\/(\d+)$/)
  if (startStepMatch) {
    return {
      type: 'step',
      value: Number(startStepMatch[1]),
      step: Number(startStepMatch[2])
    }
  }

  const rangeMatch = trimmed.match(/^(\d+)-(\d+)$/)
  if (rangeMatch) {
    return {
      type: 'range',
      start: Number(rangeMatch[1]),
      end: Number(rangeMatch[2])
    }
  }

  if (trimmed.includes(',')) {
    const values = trimmed.split(',').map((part) => Number(part.trim()))
    if (values.every((value) => Number.isInteger(value))) {
      return { type: 'list', values }
    }
    return { type: 'custom', raw: trimmed }
  }

  if (/^\d+$/.test(trimmed)) {
    return { type: 'value', value: Number(trimmed) }
  }

  return { type: 'custom', raw: trimmed }
}

export function buildCronField(field: CronField): string {
  switch (field.type) {
    case 'every':
      return '*'
    case 'step':
      if (field.step == null) return '*'
      if (field.value != null) return `${field.value}/${field.step}`
      return `*/${field.step}`
    case 'value':
      return String(field.value ?? 0)
    case 'range':
      return `${field.start ?? 0}-${field.end ?? 0}`
    case 'list':
      return (field.values ?? []).join(',')
    case 'custom':
      return field.raw ?? '*'
  }
}

function getFieldOrder(includeSeconds: boolean): CronFieldKey[] {
  return includeSeconds ? FIELD_ORDER_WITH_SECONDS : FIELD_ORDER_WITHOUT_SECONDS
}

export function parseCronFields(
  expression: string,
  includeSeconds: boolean
): CronFields | null {
  const parts = expression.trim().split(/\s+/)
  const expectedLength = includeSeconds ? 6 : 5
  if (parts.length !== expectedLength) return null

  const order = getFieldOrder(includeSeconds)
  const fields = createDefaultCronFields(includeSeconds)
  for (let index = 0; index < order.length; index++) {
    fields[order[index]] = parseCronField(parts[index])
  }
  return fields
}

export function buildCronExpression(fields: CronFields, includeSeconds: boolean): string {
  const order = getFieldOrder(includeSeconds)
  return order.map((key) => buildCronField(fields[key])).join(' ')
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
  options: { count?: number; includeSeconds?: boolean; timezone?: string } = {}
): Promise<{ runs: CronRunPreview[] } | { error: string }> {
  const count = options.count ?? 5
  const includeSeconds = options.includeSeconds ?? true
  const timezone = options.timezone ?? getLocalTimezone()
  const parts = expression.trim().split(/\s+/)

  if (parts.length < 5 || parts.length > 6) {
    return { error: 'invalidExpression' }
  }

  try {
    const { CronExpressionParser } = await loadCronParser()
    const interval = CronExpressionParser.parse(expression, { currentDate: new Date() })
    const now = new Date()
    const runs: CronRunPreview[] = []

    for (let i = 0; i < count; i++) {
      const nextDate = interval.next().toDate()
      runs.push({
        absolute: formatAbsoluteInTimezone(nextDate, timezone, includeSeconds),
        relative: formatRelativeRunTime(nextDate, now),
        timestamp: nextDate.getTime()
      })
    }

    return { runs }
  } catch {
    return { error: 'invalidExpression' }
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
