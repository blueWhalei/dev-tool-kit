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

  it('parses group comment metadata', () => {
    const entries = parseManagedEntries('192.168.1.10\tapi.local # @devtoolkit-group=dev')
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
  it('does not interpret a marker mentioned inside an ordinary comment as a block boundary', () => {
    expect(
      splitHostsFile('# documentation mentions # BEGIN DevToolkit\n127.0.0.1 localhost').prefix
    ).toContain('127.0.0.1 localhost')
  })
  it.each([
    `${MANAGED_BLOCK_START}\n127.0.0.1 first.local`,
    `${MANAGED_BLOCK_START}\n${MANAGED_BLOCK_START}\n${MANAGED_BLOCK_END}`
  ])('rejects malformed managed boundaries', content => {
    expect(() => splitHostsFile(content)).toThrow('invalidHostsFormat')
  })
})

describe('serializeManagedBlock / composeHostsFile', () => {
  it.each(['@devtoolkit-group=prod', '@devtoolkit-group=%bad note', '  spaced note  '])(
    'round-trips a literal comment: %s',
    comment => {
      const content = composeHostsFile(splitHostsFile(''), [
        { id: 'a', ip: '::1', hostname: 'example.local', enabled: true, comment }
      ])
      expect(splitHostsFile(content).entries[0]).toMatchObject({ comment, group: undefined })
    }
  )
  it('does not discard additional host aliases when rewriting a managed block', () => {
    const parsed = splitHostsFile(
      `${MANAGED_BLOCK_START}\n127.0.0.1 first.local second.local\n${MANAGED_BLOCK_END}`
    )
    expect(parsed.entries.map(entry => entry.hostname)).toEqual(['first.local', 'second.local'])
  })
  it('rejects duplicate mappings and malformed records before a rewrite can discard them', () => {
    expect(() => parseManagedEntries('not-an-ip first.local')).toThrow('invalidHostsFormat')
    expect(() => parseManagedEntries('::1 first.local\n::1 first.local')).toThrow(
      'invalidHostsFormat'
    )
    expect(() => parseManagedEntries('::1 first.local # @devtoolkit-group=%0A')).toThrow(
      'invalidHostsFormat'
    )
    const entry = { id: 'a', ip: '::1', hostname: 'first.local', enabled: true }
    expect(() => composeHostsFile(splitHostsFile(''), [entry, { ...entry, id: 'b' }])).toThrow(
      'invalidHostsFormat'
    )
  })
  it('keeps IPv6 and group metadata in OS-compatible records', () => {
    const parsed = splitHostsFile('')
    const content = composeHostsFile(parsed, [
      {
        id: 'a',
        ip: '::1',
        hostname: 'example.local',
        enabled: true,
        group: 'dev group',
        comment: 'test'
      }
    ])
    expect(content).toContain(
      '::1\texample.local # @devtoolkit-group=dev%20group @devtoolkit-comment=test'
    )
    expect(splitHostsFile(content).entries[0]).toMatchObject({
      ip: '::1',
      group: 'dev group',
      comment: 'test'
    })
  })
  it('rejects the invalid group-prefix format instead of converting it', () => {
    expect(() => parseManagedEntries('[dev] 127.0.0.1 example.local')).toThrow('invalidHostsFormat')
  })
  it('round-trips through compose', () => {
    const entries = parseManagedEntries('127.0.0.1\tlocalhost # test')
    const parsed = splitHostsFile('')
    const composed = composeHostsFile(parsed, entries)
    expect(composed).toContain(MANAGED_BLOCK_START)
    expect(composed).toContain(MANAGED_BLOCK_END)
    expect(composed).toContain('127.0.0.1\tlocalhost # @devtoolkit-comment=test')
  })
})
