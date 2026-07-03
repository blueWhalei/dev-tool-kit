import { createHash } from 'crypto'
import { isValidIP, isValidHostname } from '@dev-tool-kit/shared'
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
    const groupMatch = cleanLine.match(/^\[([^\]]+)\]\s*/)
    if (groupMatch) {
      group = groupMatch[1]
      cleanLine = cleanLine.substring(groupMatch[0].length)
    }

    const commentIndex = cleanLine.indexOf('#')
    let entryLine = cleanLine
    let comment: string | undefined

    if (commentIndex !== -1) {
      entryLine = cleanLine.substring(0, commentIndex).trim()
      comment = cleanLine.substring(commentIndex + 1).trim()
    }

    const parts = entryLine.split(/\s+/)
    if (parts.length >= 2) {
      const ip = parts[0]
      const hostname = parts[1]

      if (isValidIP(ip) && isValidHostname(hostname)) {
        entries.push({
          id: stableEntryId(ip, hostname),
          ip,
          hostname,
          comment: comment || undefined,
          enabled,
          group
        })
      }
    }
  }

  return entries
}

export function splitHostsFile(content: string): ParsedHostsFile {
  const startIndex = content.indexOf(MANAGED_BLOCK_START)
  const endIndex = content.indexOf(MANAGED_BLOCK_END)

  if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
    const prefix = content.substring(0, startIndex).replace(/\s+$/, '')
    const blockContent = content.substring(startIndex + MANAGED_BLOCK_START.length, endIndex)
    const suffix = content.substring(endIndex + MANAGED_BLOCK_END.length).replace(/^\s+/, '')
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
  const lines: string[] = [
    MANAGED_BLOCK_START,
    '# Managed by DevToolkit',
    ''
  ]

  for (const entry of entries) {
    const prefix = entry.enabled ? '' : '# '
    const groupPrefix = entry.group ? `[${entry.group}] ` : ''
    const comment = entry.comment ? ` # ${entry.comment}` : ''
    lines.push(`${prefix}${groupPrefix}${entry.ip}\t${entry.hostname}${comment}`)
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
