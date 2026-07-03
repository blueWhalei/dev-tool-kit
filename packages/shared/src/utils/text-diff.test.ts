import { describe, it, expect } from 'vitest'
import { computeLineDiff, formatDiffResult, getDiffStats } from './text-diff'

describe('computeLineDiff', () => {
  it('detects equal lines', () => {
    const diff = computeLineDiff('a\nb\nc', 'a\nb\nc')
    expect(diff.every(l => l.type === 'equal')).toBe(true)
  })

  it('detects insertions and deletions', () => {
    const diff = computeLineDiff('a\nb\nc', 'a\nx\nc')
    const stats = getDiffStats(diff)
    expect(stats.delete).toBe(1)
    expect(stats.insert).toBe(1)
    expect(stats.equal).toBe(2)
  })

  it('formats diff output', () => {
    const diff = computeLineDiff('old', 'new')
    const formatted = formatDiffResult(diff)
    expect(formatted).toContain('- old')
    expect(formatted).toContain('+ new')
  })

  it('ignores whitespace when enabled', () => {
    const diff = computeLineDiff('a  b', 'a b', { ignoreWhitespace: true })
    expect(diff.every(line => line.type === 'equal')).toBe(true)
  })

  it('ignores case when enabled', () => {
    const diff = computeLineDiff('Hello', 'hello', { ignoreCase: true })
    expect(diff.every(line => line.type === 'equal')).toBe(true)
  })
})
