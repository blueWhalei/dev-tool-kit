import { describe, it, expect } from 'vitest'
import {
  buildCronExpression,
  buildCronField,
  createDefaultCronFields,
  describeCronExpression,
  formatAbsoluteInTimezone,
  formatRelativeRunTime,
  getLocalTimezone,
  getTimezoneOptions,
  parseCronField,
  parseCronFields
} from './cron-schedule'

describe('parseCronField', () => {
  it('parses every', () => {
    expect(parseCronField('*')).toEqual({ type: 'every' })
  })

  it('parses step from start', () => {
    expect(parseCronField('*/5')).toEqual({ type: 'step', step: 5 })
  })

  it('parses step with offset', () => {
    expect(parseCronField('10/15')).toEqual({ type: 'step', value: 10, step: 15 })
  })

  it('parses range', () => {
    expect(parseCronField('1-5')).toEqual({ type: 'range', start: 1, end: 5 })
  })

  it('parses list', () => {
    expect(parseCronField('1,3,5')).toEqual({ type: 'list', values: [1, 3, 5] })
  })

  it('parses value', () => {
    expect(parseCronField('9')).toEqual({ type: 'value', value: 9 })
  })

  it('falls back to custom', () => {
    expect(parseCronField('MON-FRI')).toEqual({ type: 'custom', raw: 'MON-FRI' })
  })
})

describe('buildCronField', () => {
  it('builds every', () => {
    expect(buildCronField({ type: 'every' })).toBe('*')
  })

  it('builds step', () => {
    expect(buildCronField({ type: 'step', step: 5 })).toBe('*/5')
    expect(buildCronField({ type: 'step', value: 10, step: 15 })).toBe('10/15')
  })

  it('builds range and list', () => {
    expect(buildCronField({ type: 'range', start: 1, end: 5 })).toBe('1-5')
    expect(buildCronField({ type: 'list', values: [1, 3, 5] })).toBe('1,3,5')
  })
})

describe('parseCronFields / buildCronExpression', () => {
  it('round-trips a 6-field expression', () => {
    const expression = '0 0 9 * * *'
    const fields = parseCronFields(expression, true)
    expect(fields).not.toBeNull()
    expect(buildCronExpression(fields!, true)).toBe(expression)
  })

  it('round-trips a 5-field expression', () => {
    const expression = '*/5 * * * *'
    const fields = parseCronFields(expression, false)
    expect(fields).not.toBeNull()
    expect(buildCronExpression(fields!, false)).toBe(expression)
  })

  it('returns null for invalid field count', () => {
    expect(parseCronFields('0 0 9 * *', true)).toBeNull()
    expect(parseCronFields('0 0 9 * * *', false)).toBeNull()
  })

  it('creates sensible defaults', () => {
    const fields = createDefaultCronFields(true)
    expect(buildCronExpression(fields, true)).toBe('0 0 9 * * *')
  })
})

describe('timezone helpers', () => {
  it('returns a timezone string', () => {
    expect(getLocalTimezone()).toMatch(/\S+/)
  })

  it('includes local timezone in options', () => {
    const local = getLocalTimezone()
    expect(getTimezoneOptions(local)).toContain(local)
  })

  it('formats absolute time in timezone', () => {
    const date = new Date('2026-07-06T09:30:00+08:00')
    const formatted = formatAbsoluteInTimezone(date, 'Asia/Shanghai', true)
    expect(formatted).toBe('2026-07-06 09:30:00')
  })
})

describe('describeCronExpression', () => {
  it('describes daily 9am expression', () => {
    expect(describeCronExpression('0 0 9 * * *', true)).toBe('每天上午 9:00 执行')
  })

  it('falls back to custom description', () => {
    expect(describeCronExpression('*/15 * * * *', false)).toBe('自定义定时任务')
  })
})

describe('formatRelativeRunTime', () => {
  it('formats future time in minutes', () => {
    const target = new Date(Date.now() + 5 * 60 * 1000)
    expect(formatRelativeRunTime(target)).toBe('5 分钟后')
  })
})

describe('getCronNextRuns', () => {
  it('returns next runs for valid expression', async () => {
    const { getCronNextRuns } = await import('./cron-schedule')
    const result = await getCronNextRuns('0 0 9 * * *', {
      count: 3,
      includeSeconds: true,
      timezone: 'Asia/Shanghai'
    })
    expect('runs' in result).toBe(true)
    if ('runs' in result) {
      expect(result.runs).toHaveLength(3)
      expect(result.runs[0].absolute).toMatch(/^\d{4}-\d{2}-\d{2}/)
    }
  })

  it('returns error key for invalid expression', async () => {
    const { getCronNextRuns } = await import('./cron-schedule')
    const result = await getCronNextRuns('invalid', { includeSeconds: true })
    expect(result).toEqual({ error: 'invalidExpression' })
  })
})
