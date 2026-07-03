import { describe, it, expect } from 'vitest'
import { describeCronExpression, formatRelativeRunTime } from './cron-schedule'

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
    const result = await getCronNextRuns('0 0 9 * * *', { count: 3, includeSeconds: true })
    expect('runs' in result).toBe(true)
    if ('runs' in result) {
      expect(result.runs).toHaveLength(3)
      expect(result.runs[0].absolute).toMatch(/^\d{4}-\d{2}-\d{2}/)
    }
  })
})
