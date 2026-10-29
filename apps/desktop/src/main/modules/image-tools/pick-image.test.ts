import { beforeEach, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({
  handlers: new Map<string, () => Promise<unknown>>(),
  dialog: vi.fn(),
  stat: vi.fn(),
  read: vi.fn()
}))
vi.mock('../../typed-ipc', () => ({
  handleIpc: (name: string, handler: () => Promise<unknown>) => mocks.handlers.set(name, handler)
}))
vi.mock('./batch-ipc', () => ({ setupBatchIPC: vi.fn() }))
vi.mock('electron', () => ({
  dialog: { showOpenDialog: mocks.dialog },
  clipboard: {},
  BrowserWindow: {}
}))
vi.mock('fs/promises', () => ({
  stat: mocks.stat,
  readFile: mocks.read,
  writeFile: vi.fn(),
  mkdir: vi.fn()
}))
vi.mock('../../logger', () => ({ logger: { info: vi.fn(), error: vi.fn() } }))
vi.mock('../path-guard', () => ({ authorizePath: vi.fn(), isPathAuthorized: () => true }))
import { setupImageToolsIPC } from './index'
beforeEach(() => {
  vi.clearAllMocks()
  mocks.dialog.mockResolvedValue({ canceled: false, filePaths: ['/fixture/image.png'] })
  setupImageToolsIPC()
})
it('returns an explicit limit error without loading an oversized image', async () => {
  mocks.stat.mockResolvedValue({ size: 64 * 1024 * 1024 + 1 })
  expect(await mocks.handlers.get('image-tools:pickImage')!()).toEqual({ error: 'imageTooLarge' })
  expect(mocks.read).not.toHaveBeenCalled()
})
it('distinguishes cancellation from read failure', async () => {
  mocks.dialog.mockResolvedValueOnce({ canceled: true, filePaths: [] })
  expect(await mocks.handlers.get('image-tools:pickImage')!()).toBeNull()
  mocks.stat.mockRejectedValueOnce(new Error('read failed'))
  expect(await mocks.handlers.get('image-tools:pickImage')!()).toEqual({ error: 'imageLoadFailed' })
})
