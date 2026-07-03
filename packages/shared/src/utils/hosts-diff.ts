import type { HostsEntry } from '../types'

export type HostsChangeType = 'added' | 'removed' | 'modified' | 'unchanged'

export interface HostsEntryChange {
  type: HostsChangeType
  hostname: string
  before?: HostsEntry
  after?: HostsEntry
  details: string[]
}

function entryKey(entry: HostsEntry): string {
  return entry.hostname.toLowerCase()
}

function describeChanges(before: HostsEntry, after: HostsEntry): string[] {
  const changes: string[] = []
  if (before.ip !== after.ip) changes.push(`IP: ${before.ip} → ${after.ip}`)
  if (before.enabled !== after.enabled) changes.push(before.enabled ? '启用 → 禁用' : '禁用 → 启用')
  if (before.group !== after.group) changes.push(`分组: ${before.group ?? '无'} → ${after.group ?? '无'}`)
  if ((before.comment ?? '') !== (after.comment ?? '')) {
    changes.push(`备注: ${before.comment || '—'} → ${after.comment || '—'}`)
  }
  return changes
}

export function diffHostsEntries(current: HostsEntry[], incoming: HostsEntry[]): HostsEntryChange[] {
  const currentMap = new Map(current.map(entry => [entryKey(entry), entry]))
  const incomingMap = new Map(incoming.map(entry => [entryKey(entry), entry]))
  const keys = new Set([...currentMap.keys(), ...incomingMap.keys()])
  const result: HostsEntryChange[] = []

  for (const key of [...keys].sort()) {
    const before = currentMap.get(key)
    const after = incomingMap.get(key)

    if (before && after) {
      const details = describeChanges(before, after)
      result.push({
        type: details.length > 0 ? 'modified' : 'unchanged',
        hostname: after.hostname,
        before,
        after,
        details
      })
      continue
    }

    if (after) {
      result.push({ type: 'added', hostname: after.hostname, after, details: [] })
      continue
    }

    if (before) {
      result.push({ type: 'removed', hostname: before.hostname, before, details: [] })
    }
  }

  return result
}

export interface HostsDiffSummary {
  added: number
  removed: number
  modified: number
  unchanged: number
}

export function summarizeHostsDiff(changes: HostsEntryChange[]): HostsDiffSummary {
  return changes.reduce(
    (summary, change) => {
      summary[change.type]++
      return summary
    },
    { added: 0, removed: 0, modified: 0, unchanged: 0 }
  )
}
