import { createServer, isIP } from 'node:net'
import type { PortDiagnosis, PortTarget } from '@dev-tool-kit/shared'
import { normalizePortAddress } from '@dev-tool-kit/shared'

export function matchesAddress(target: string | undefined, localAddress: string): boolean {
  if (!target) return true
  const local = normalizePortAddress(localAddress)
  if (!local || isIP(local) !== isIP(target)) return false
  return (
    target === local || [target, local].some(address => address === '::' || address === '0.0.0.0')
  )
}

function tryBind(
  port: number,
  host: string
): Promise<'bindable' | 'unavailable' | 'unsupported' | 'unknown'> {
  return new Promise(resolve => {
    const server = createServer(socket => socket.destroy())
    server.once('error', (error: NodeJS.ErrnoException) => {
      if (error.code === 'EADDRINUSE') resolve('unavailable')
      else if (error.code === 'EAFNOSUPPORT' || error.code === 'EPROTONOSUPPORT')
        resolve('unsupported')
      else resolve('unknown')
    })
    server.listen({ port, host, exclusive: true }, () =>
      server.close(error => resolve(error ? 'unknown' : 'bindable'))
    )
  })
}

export async function probeAvailability(target: PortTarget): Promise<PortDiagnosis['status']> {
  // Close each probe before trying the next address. Never retain a user's port.
  const hosts = target.address ? [target.address] : ['0.0.0.0', '::']
  let bound = false
  for (const host of hosts) {
    const state = await tryBind(target.port, host)
    if (state === 'unknown' || state === 'unavailable') return state
    if (state === 'bindable') bound = true
  }
  return bound ? 'bindable' : 'unknown'
}
