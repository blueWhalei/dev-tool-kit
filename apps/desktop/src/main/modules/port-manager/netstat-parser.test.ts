import { describe, it, expect } from 'vitest'
import { parseWindowsNetstat } from './netstat-parser'
import { isProtectedPid } from './scanner'

describe('parseWindowsNetstat', () => {
  it('parses TCP LISTENING line', () => {
    const sample = `Active Connections

  Proto  Local Address          Foreign Address        State           PID
  TCP    0.0.0.0:3000           0.0.0.0:0              LISTENING       1234
`
    const ports = parseWindowsNetstat(sample)
    expect(ports).toHaveLength(1)
    expect(ports[0].port).toBe(3000)
    expect(ports[0].pid).toBe(1234)
    expect(ports[0].protocol).toBe('TCP')
    expect(ports[0].state).toBe('LISTENING')
  })

  it('ignores header lines', () => {
    expect(parseWindowsNetstat('Active Connections\nProto Local')).toHaveLength(0)
  })
})

describe('isProtectedPid', () => {
  it('protects current process pid', () => {
    expect(isProtectedPid(process.pid)).toBe(true)
  })

  it('protects invalid pids', () => {
    expect(isProtectedPid(0)).toBe(true)
    expect(isProtectedPid(-1)).toBe(true)
  })
})
