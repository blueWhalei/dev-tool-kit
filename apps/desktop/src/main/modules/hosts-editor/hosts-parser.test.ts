import { describe, it, expect } from 'vitest'
import {
  parseManagedEntries,
  splitHostsFile,
  composeHostsFile,
  stableEntryId,
  MANAGED_BLOCK_START,
  MANAGED_BLOCK_END
} from './hosts-parser'

describe('stableEntryId', () => {
  it('is deterministic for same ip/hostname', () => {
    expect(stableEntryId('127.0.0.1', 'localhost')).toBe(stableEntryId('127.0.0.1', 'localhost'))
  })
})

describe('parseManagedEntries', () => {
  it('parses enabled entry with comment', () => {
    const entries = parseManagedEntries('127.0.0.1\tlocalhost # loopback')
    expect(entries).toHaveLength(1)
    expect(entries[0].ip).toBe('127.0.0.1')
    expect(entries[0].hostname).toBe('localhost')
    expect(entries[0].comment).toBe('loopback')
    expect(entries[0].enabled).toBe(true)
  })

  it('parses disabled entry', () => {
    const entries = parseManagedEntries('# 127.0.0.1\tdisabled.local')
    expect(entries).toHaveLength(1)
    expect(entries[0].enabled).toBe(false)
  })

  it('parses group prefix', () => {
    const entries = parseManagedEntries('[dev] 192.168.1.10\tapi.local')
    expect(entries[0].group).toBe('dev')
  })
})

describe('splitHostsFile', () => {
  it('extracts managed block entries', () => {
    const content = `# system
${MANAGED_BLOCK_START}
127.0.0.1\tlocalhost
${MANAGED_BLOCK_END}
# tail`
    const parsed = splitHostsFile(content)
    expect(parsed.prefix).toContain('system')
    expect(parsed.entries).toHaveLength(1)
    expect(parsed.suffix).toContain('tail')
  })

  it('returns empty entries when no managed block', () => {
    const parsed = splitHostsFile('127.0.0.1 localhost')
    expect(parsed.entries).toHaveLength(0)
    expect(parsed.prefix).toContain('127.0.0.1')
  })
})

describe('serializeManagedBlock / composeHostsFile', () => {
  it('round-trips through compose', () => {
    const entries = parseManagedEntries('127.0.0.1\tlocalhost # test')
    const parsed = splitHostsFile('')
    const composed = composeHostsFile(parsed, entries)
    expect(composed).toContain(MANAGED_BLOCK_START)
    expect(composed).toContain(MANAGED_BLOCK_END)
    expect(composed).toContain('127.0.0.1\tlocalhost # test')
  })
})
