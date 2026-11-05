import { createServer, type AddressInfo } from 'node:net'
import { expect, it } from 'vitest'
import { matchesAddress, probeAvailability } from './bind-probe'

it('restricts actions to a matching address and family, including wildcards', () => {
  expect(matchesAddress('127.0.0.1', '127.0.0.2')).toBe(false)
  expect(matchesAddress('127.0.0.1', '0.0.0.0')).toBe(true)
  expect(matchesAddress('127.0.0.1', '[::]')).toBe(false)
  expect(matchesAddress('::1', '[0:0:0:0:0:0:0:1]')).toBe(true)
  expect(matchesAddress('::1', '*')).toBe(false)
  expect(matchesAddress(undefined, '*')).toBe(true)
})

it('detects a listener even when the process table misses it and closes successful probes', async () => {
  const server = createServer()
  await new Promise<void>((resolve, reject) =>
    server.once('error', reject).listen(0, '127.0.0.1', resolve)
  )
  const target = { port: (server.address() as AddressInfo).port, address: '127.0.0.1' }
  try {
    expect(await probeAvailability(target)).toBe('unavailable')
  } finally {
    await new Promise<void>(resolve => server.close(() => resolve()))
  }
  expect(await probeAvailability(target)).toBe('bindable')
  expect(await probeAvailability(target)).toBe('bindable')
})
