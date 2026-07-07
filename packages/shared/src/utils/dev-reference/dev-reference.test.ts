import { describe, it, expect } from 'vitest'
import { buildGitCommand, filterGitCommands, filterMimeTypes } from './index'

describe('dev-reference utils', () => {
  it('filters mime types by extension', () => {
    const results = filterMimeTypes('json', 'en')
    expect(results.some(r => r.extension === '.json')).toBe(true)
  })

  it('builds git command with params', () => {
    const template = filterGitCommands('', 'all', 'en').find(t => t.id === 'stash-push')
    expect(template).toBeTruthy()
    if (!template) return
    expect(buildGitCommand(template, { message: 'test' })).toBe('git stash push -m "test"')
  })
})
