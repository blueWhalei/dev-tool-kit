import { describe, it, expect } from 'vitest'
import {
  computeLineDiff,
  computeWordDiff,
  computeDiff,
  formatDiffResult,
  getDiffStats
} from './text-diff'

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

describe('computeWordDiff', () => {
  it('detects equal words', () => {
    const diff = computeWordDiff('hello world', 'hello world')
    expect(diff.every(l => l.type === 'equal')).toBe(true)
  })

  it('detects word insertions and deletions', () => {
    const diff = computeWordDiff('hello world', 'hello brave world')
    const stats = getDiffStats(diff)
    expect(stats.insert).toBeGreaterThanOrEqual(1)
    expect(stats.equal).toBeGreaterThanOrEqual(2)
    expect(diff.some(l => l.type === 'insert' && l.content === 'brave')).toBe(true)
  })

  it('detects replaced words', () => {
    const diff = computeWordDiff('foo bar', 'foo baz')
    const stats = getDiffStats(diff)
    expect(stats.delete).toBe(1)
    expect(stats.insert).toBe(1)
    expect(diff.some(l => l.type === 'equal' && l.content === 'foo')).toBe(true)
  })

  it('preserves whitespace tokens', () => {
    const diff = computeWordDiff('a  b', 'a b')
    const wsTokens = diff.filter(l => /^\s+$/.test(l.content))
    expect(wsTokens.length).toBeGreaterThan(0)
  })

  it('ignores whitespace when enabled', () => {
    const diff = computeWordDiff('hello   world', 'hello world', { ignoreWhitespace: true })
    expect(diff.every(line => line.type === 'equal')).toBe(true)
  })

  it('ignores case when enabled', () => {
    const diff = computeWordDiff('Hello World', 'hello world', { ignoreCase: true })
    expect(diff.every(line => line.type === 'equal')).toBe(true)
  })
})

describe('computeDiff', () => {
  it('delegates to line diff by default', () => {
    const diff = computeDiff('a\nb', 'a\nc', 'line')
    expect(getDiffStats(diff).delete).toBe(1)
    expect(getDiffStats(diff).insert).toBe(1)
  })

  it('delegates to word diff in word mode', () => {
    const diff = computeDiff('one two', 'one three', 'word')
    expect(getDiffStats(diff).delete).toBe(1)
    expect(getDiffStats(diff).insert).toBe(1)
  })
})
