import { createHash } from 'crypto'
import { isValidIP, isValidHostname, isHostsEntry } from '@dev-tool-kit/shared'
import type { HostsEntry } from '@dev-tool-kit/shared'

export const MANAGED_BLOCK_START = '# BEGIN DevToolkit'
export const MANAGED_BLOCK_END = '# END DevToolkit'

export interface ParsedHostsFile {
  prefix: string
  entries: HostsEntry[]
  suffix: string
}

export function stableEntryId(ip: string, hostname: string): string {
  return createHash('sha256').update(`${ip}\0${hostname}`).digest('hex').slice(0, 16)
}

export function parseManagedEntries(blockContent: string): HostsEntry[] {
  const entries: HostsEntry[] = []
  const ids = new Set<string>()
  const lines = blockContent.split('\n')

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed === MANAGED_BLOCK_START || trimmed === MANAGED_BLOCK_END) continue
    if (trimmed.startsWith('#') && !trimmed.startsWith('# ')) continue

    let enabled = true
    let cleanLine = trimmed

    if (trimmed.startsWith('#')) {
      enabled = false
      cleanLine = trimmed.substring(1).trim()
    }

    let group: string | undefined
    const commentIndex = cleanLine.indexOf('#')
    let entryLine = cleanLine
    let comment: string | undefined

    if (commentIndex !== -1) {
      entryLine = cleanLine.substring(0, commentIndex).trim()
      comment = cleanLine.substring(commentIndex + 1).trim()
      const metadata = comment.match(/^@devtoolkit-group=(\S+)(?:\s+(.*))?$/)
      if (metadata) {
        try {
          group = decodeURIComponent(metadata[1])
        } catch {
          throw new Error('invalidHostsFormat')
        }
        comment = metadata[2]
      }
      if (comment?.startsWith('@devtoolkit-comment=')) {
        try {
          comment = decodeURIComponent(comment.slice('@devtoolkit-comment='.length))
        } catch {
          throw new Error('invalidHostsFormat')
        }
      }
    }

    if (entryLine.startsWith('[')) throw new Error('invalidHostsFormat')
    const parts = entryLine.split(/\s+/)
    const ip = parts[0]
    if (!enabled && !isValidIP(ip)) continue // Ordinary comment, not a disabled mapping.
    if (parts.length < 2 || !isValidIP(ip) || !parts.slice(1).every(isValidHostname))
      throw new Error('invalidHostsFormat')
    for (const hostname of parts.slice(1)) {
      const entry = {
        id: stableEntryId(ip, hostname),
        ip,
        hostname,
        comment: comment || undefined,
        enabled,
        group
      }
      if (!isHostsEntry(entry) || ids.has(entry.id)) throw new Error('invalidHostsFormat')
      ids.add(entry.id)
      entries.push(entry)
    }
  }

  return entries
}

export function splitHostsFile(content: string): ParsedHostsFile {
  const lines = content.split('\n')
  const starts = lines.flatMap((line, index) =>
    line.trim() === MANAGED_BLOCK_START ? [index] : []
  )
  const ends = lines.flatMap((line, index) => (line.trim() === MANAGED_BLOCK_END ? [index] : []))
  if (starts.length || ends.length) {
    if (starts.length !== 1 || ends.length !== 1 || starts[0] >= ends[0])
      throw new Error('invalidHostsFormat')
    const prefix = lines.slice(0, starts[0]).join('\n').replace(/\s+$/, '')
    const blockContent = lines.slice(starts[0] + 1, ends[0]).join('\n')
    const suffix = lines
      .slice(ends[0] + 1)
      .join('\n')
      .replace(/^\s+/, '')
    return {
      prefix,
      entries: parseManagedEntries(blockContent),
      suffix
    }
  }

  return {
    prefix: content.replace(/\s+$/, ''),
    entries: [],
    suffix: ''
  }
}

export function serializeManagedBlock(entries: HostsEntry[]): string {
  const lines: string[] = [MANAGED_BLOCK_START, '# Managed by DevToolkit', '']
  const mappings = new Set<string>()

  for (const entry of entries) {
    if (!isHostsEntry(entry)) throw new Error('invalidHostsFormat')
    const mapping = `${entry.ip}\0${entry.hostname}`
    if (mappings.has(mapping)) throw new Error('invalidHostsFormat')
    mappings.add(mapping)
    const prefix = entry.enabled ? '' : '# '
    const metadata = [
      entry.group ? `@devtoolkit-group=${encodeURIComponent(entry.group)}` : '',
      entry.comment ? `@devtoolkit-comment=${encodeURIComponent(entry.comment)}` : ''
    ]
      .filter(Boolean)
      .join(' ')
    const comment = metadata ? ` # ${metadata}` : ''
    lines.push(`${prefix}${entry.ip}\t${entry.hostname}${comment}`)
  }

  lines.push('', MANAGED_BLOCK_END)
  return lines.join('\n')
}

export function composeHostsFile(parsed: ParsedHostsFile, entries: HostsEntry[]): string {
  const parts: string[] = []
  if (parsed.prefix) parts.push(parsed.prefix)
  parts.push(serializeManagedBlock(entries))
  if (parsed.suffix) parts.push(parsed.suffix)
  return parts.join('\n\n') + '\n'
}
