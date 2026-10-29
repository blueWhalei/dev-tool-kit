import type { PortInfo } from '@dev-tool-kit/shared'

function address(value: string): { port: number; localAddress: string } | null {
  const split = value.lastIndexOf(':')
  if (split < 0) return null
  const rawPort = value.slice(split + 1)
  if (!/^\d+$/.test(rawPort)) return null
  const port = Number(rawPort)
  return port > 0 && port <= 65535 ? { port, localAddress: value.slice(0, split) } : null
}

export function parseMacLsof(output: string): PortInfo[] {
  const result: PortInfo[] = []
  for (const line of output.split('\n')) {
    const parts = line.trim().split(/\s+/)
    const index = parts.findIndex(part => part === 'TCP' || part === 'UDP')
    if (index < 0) continue
    const protocol = parts[index]
    if (protocol !== 'TCP' && protocol !== 'UDP') continue
    if (protocol === 'TCP' && !parts.includes('(LISTEN)')) continue
    const endpoint = address((parts[index + 1] ?? '').split('->')[0])
    if (!endpoint) continue
    result.push({
      ...endpoint,
      protocol,
      pid: Number(parts[1]) || 0,
      state: protocol === 'TCP' ? 'LISTENING' : 'UNCONN'
    })
  }
  return result
}

export function parseLinuxNetstat(output: string): PortInfo[] {
  const result: PortInfo[] = []
  for (const line of output.split('\n')) {
    const parts = line.trim().split(/\s+/)
    const protocol = parts[0]?.replace(/6$/, '').toUpperCase()
    if (protocol !== 'TCP' && protocol !== 'UDP') continue
    const endpoint = address(parts[3] ?? '')
    if (!endpoint) continue
    const state = protocol === 'TCP' ? parts[5] : 'UNCONN'
    const pid = Number((parts[protocol === 'TCP' ? 6 : 5] ?? '').split('/')[0]) || 0
    result.push({ ...endpoint, protocol, state: state ?? 'UNKNOWN', pid })
  }
  return result
}
