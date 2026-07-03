import { describe, it, expect } from 'vitest'
import { diffHostsEntries, summarizeHostsDiff } from './hosts-diff'
import type { HostsEntry } from '../types'

const baseEntry = (hostname: string, ip: string): HostsEntry => ({
  id: hostname,
  hostname,
  ip,
  enabled: true
})

describe('diffHostsEntries', () => {
  it('detects added and removed entries', () => {
    const current = [baseEntry('a.local', '127.0.0.1')]
    const incoming = [baseEntry('b.local', '127.0.0.2')]
    const diff = diffHostsEntries(current, incoming)
    const summary = summarizeHostsDiff(diff)
    expect(summary.added).toBe(1)
    expect(summary.removed).toBe(1)
  })

  it('detects modified entries', () => {
    const current = [baseEntry('a.local', '127.0.0.1')]
    const incoming = [{ ...baseEntry('a.local', '10.0.0.1'), enabled: false }]
    const diff = diffHostsEntries(current, incoming)
    expect(diff[0].type).toBe('modified')
    expect(diff[0].details.length).toBeGreaterThan(0)
  })
})
