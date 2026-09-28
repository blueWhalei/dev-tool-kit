import { beforeEach, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({ execute: vi.fn() }))
vi.mock('util', () => ({ promisify: () => mocks.execute }))
vi.mock('os', () => ({ platform: () => 'win32' }))
vi.mock('../../logger', () => ({ logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }))
import { PortScanner } from './scanner'
beforeEach(() => {
  mocks.execute.mockReset()
})
it('coalesces simultaneous requests and expires names with the port snapshot', async () => {
  let name = 'first.exe'
  mocks.execute.mockImplementation(async (command: string) => ({
    stdout:
      command === 'netstat'
        ? '  TCP    127.0.0.1:8080    0.0.0.0:0    LISTENING    321'
        : '"' + name + '","321","Console","1","100 K"'
  }))
  const scanner = new PortScanner()
  const [a, b] = await Promise.all([scanner.getAllPorts(), scanner.getAllPorts()])
  expect(a).toEqual(b)
  expect(a[0].service).toBe('first.exe')
  expect(mocks.execute).toHaveBeenCalledTimes(2)
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
