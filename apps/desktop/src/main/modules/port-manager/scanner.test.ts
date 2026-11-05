import { beforeEach, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({ execute: vi.fn(), inspect: vi.fn(), signal: vi.fn() }))
vi.mock('util', () => ({ promisify: () => mocks.execute }))
vi.mock('os', () => ({ platform: () => 'win32' }))
vi.mock('../../logger', () => ({ logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }))
vi.mock('./process-instance', () => ({
  inspectInstances: mocks.inspect,
  terminateInstance: mocks.signal
}))
import { PortScanner } from './scanner'
beforeEach(() => {
  mocks.execute.mockReset()
  mocks.inspect.mockReset().mockResolvedValue(new Map())
  mocks.signal.mockReset()
})
it('coalesces simultaneous requests and expires names with the port snapshot', async () => {
  let name = 'first.exe'
  mocks.execute.mockResolvedValue({ stdout: 'TCP 127.0.0.1:8080 0.0.0.0:0 LISTENING 321' })
  mocks.inspect.mockImplementation(async () => new Map([[321, { name, instanceId: '123' }]]))
  const scanner = new PortScanner()
  const [a, b] = await Promise.all([scanner.getAllPorts(), scanner.getAllPorts()])
  expect(a).toEqual(b)
  expect(a[0].service).toBe('first.exe')
  expect(mocks.execute).toHaveBeenCalledTimes(1)
  expect(mocks.execute.mock.calls.every(call => call[2].timeout === 10000)).toBe(true)
  name = 'reused.exe'
  scanner.invalidateCache()
  expect((await scanner.getAllPorts())[0].service).toBe('reused.exe')
})
it('does not cache an old scan after invalidation', async () => {
  let complete!: (value: { stdout: string }) => void
  mocks.execute.mockImplementationOnce(
    () =>
      new Promise(resolve => {
        complete = resolve
      })
  )
  const scanner = new PortScanner()
  const old = scanner.getAllPorts()
  scanner.invalidateCache()
  complete({ stdout: '' })
  await old
  mocks.execute.mockResolvedValue({ stdout: '' })
  await scanner.getAllPorts()
  expect(mocks.execute).toHaveBeenCalledTimes(2)
})

const listener = { port: 3000, localAddress: '127.0.0.1', pid: 987654, instanceId: '123' }
const original = 'TCP 127.0.0.1:3000 0.0.0.0:0 LISTENING 987654'

it('bypasses the list cache and refuses to signal a replaced listener', async () => {
  let snapshot = original
  mocks.execute.mockImplementation(async (file: string) => ({
    stdout: file.endsWith('netstat.exe') ? snapshot : ''
  }))
  const scanner = new PortScanner()
  mocks.inspect.mockResolvedValue(new Map([[987654, { name: 'old', instanceId: '123' }]]))
  expect(await scanner.getAllPorts()).toMatchObject([listener])
  snapshot = [
    original.replace('987654', '987655'),
    original.replace('LISTENING', 'ESTABLISHED'),
    'UDP 127.0.0.1:3000 *:* 987654'
  ].join('\n')
  expect((await scanner.diagnose({ port: 3000 })).listeners).toMatchObject([{ pid: 987655 }])
  expect(await scanner.killProcess(listener)).toEqual({
    success: false,
    errorCode: 'owner_changed'
  })
  expect(mocks.signal).not.toHaveBeenCalled()
})

it('reports a failed scan separately from an empty listener set and refuses termination', async () => {
  mocks.execute.mockRejectedValue(new Error('netstat failed'))
  const scanner = new PortScanner()
  await expect(scanner.diagnose({ port: 3000 })).rejects.toThrow('netstat failed')
  expect(await scanner.killProcess(listener)).toEqual({ success: false, errorCode: 'scan_failed' })
  expect(mocks.signal).not.toHaveBeenCalled()
})
