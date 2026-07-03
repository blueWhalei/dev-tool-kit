import type { PortInfo } from '@dev-tool-kit/shared'

/** Parse Windows `netstat -ano` output into port records. */
export function parseWindowsNetstat(output: string): PortInfo[] {
  const ports: PortInfo[] = []
  const lines = output.split('\n')

  for (const line of lines) {
    if (line.startsWith('Active') || line.startsWith('Proto')) continue

    const parts = line.trim().split(/\s+/)
    if (parts.length < 4) continue

    const protocol = parts[0].toUpperCase() as 'TCP' | 'UDP'
    if (protocol !== 'TCP' && protocol !== 'UDP') continue

    const localAddress = parts[1]
    const state = parts.length > 3 ? parts[3] : 'UNKNOWN'

    const lastColon = localAddress.lastIndexOf(':')
    if (lastColon === -1) continue

    const portStr = localAddress.substring(lastColon + 1)
    const port = parseInt(portStr, 10)

    if (isNaN(port)) continue

    let pid = 0
    if (protocol === 'TCP' && state !== 'LISTENING') {
      pid = parseInt(parts[parts.length - 1], 10) || 0
    } else if (protocol === 'UDP' || state === 'LISTENING') {
      pid = parseInt(parts[parts.length - 1], 10) || 0
    }

    if (pid > 0) {
      ports.push({
        port,
        pid,
        protocol,
        state: state || 'UNKNOWN',
        localAddress: localAddress.substring(0, lastColon)
      })
    }
  }

  return ports
}
