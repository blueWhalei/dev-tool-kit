import { beforeEach, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({
  handlers: new Map<string, (...args: unknown[]) => Promise<unknown>>(),
  write: vi.fn(),
  execute: vi.fn(),
  update: vi.fn()
}))
vi.mock('../../typed-ipc', () => ({
  handleIpc: (name: string, handler: (...args: unknown[]) => Promise<unknown>) =>
    mocks.handlers.set(name, handler)
}))
vi.mock('electron', () => ({ app: { getPath: () => '/isolated-profile' } }))
vi.mock('fs', () => ({ existsSync: () => true }))
vi.mock('fs/promises', () => ({
  readFile: async () => '127.0.0.1 localhost\n',
  writeFile: mocks.write,
  mkdir: vi.fn(),
  copyFile: vi.fn(),
  readdir: async () => [],
  unlink: vi.fn(),
  access: vi.fn(),
  constants: { W_OK: 2 }
}))
vi.mock('util', () => ({ promisify: () => mocks.execute }))
vi.mock('../../store/atomic-json', () => ({
  readJsonFile: async () => [],
  updateJsonFile: mocks.update
}))
vi.mock('../../logger', () => ({ logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }))
import { setupHostsEditorIPC } from './index'
beforeEach(() => {
  vi.clearAllMocks()
  setupHostsEditorIPC()
})
it('reports committed writes independently of DNS refresh failures', async () => {
  mocks.execute.mockRejectedValue(new Error('DNS failed'))
  const result = await mocks.handlers.get('hosts:add')!(
    {},
    { ip: '127.0.0.2', hostname: 'example.local', enabled: true, group: 'dev' }
  )
  expect(result).toMatchObject({ success: true, dnsFlushed: false })
  const content = mocks.write.mock.calls[0][1]
  expect(content).toContain('127.0.0.2\texample.local # @devtoolkit-group=dev')
  expect(content).not.toContain('[dev]')
})
it('rejects invalid imported entries and mode without saving a partial scheme', async () => {
  const scheme = {
    id: 'a',
    name: 'test',
    timestamp: '2026-10-29T00:00:00Z',
    entries: [{ id: 'b', ip: '127.0.0.1\n', hostname: 'example.local', enabled: true }]
  }
  expect(await mocks.handlers.get('hosts:importSchemes')!({}, [scheme], 'merge')).toMatchObject({
    success: false
  })
  expect(mocks.update).not.toHaveBeenCalled()
})
it('rejects malformed edits instead of truncating or coercing input', async () => {
  for (const patch of [
    { comment: 'first\nsecond' },
    { enabled: 'yes' },
    { group: 'x'.repeat(201) }
  ]) {
    expect(
      await mocks.handlers.get('hosts:add')!(
        {},
        { ip: '127.0.0.2', hostname: 'example.local', enabled: true, ...patch }
      )
    ).toMatchObject({ success: false })
  }
  expect(await mocks.handlers.get('hosts:update')!({}, 'entry', { comment: 'a\nb' })).toMatchObject(
    { success: false }
  )
  expect(mocks.write).not.toHaveBeenCalled()
})
