// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mkdtemp, writeFile, readFile, readdir, unlink, rmdir } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'
import type { FileEntry, RenamePreview, RenameResult, RenameRule } from '@dev-tool-kit/shared'
import { generatePreviews } from './rules'
import { runWorkerTask } from '../worker-task'
import { setupFileRenamerIPC } from './index'
const mocks = vi.hoisted(() => ({
  handlers: new Map<string, (...args: unknown[]) => Promise<unknown>>(),
  pick: vi.fn()
}))
vi.mock('electron', () => ({
  ipcMain: {
    handle: (name: string, fn: (...args: unknown[]) => Promise<unknown>) =>
      mocks.handlers.set(name, fn)
  },
  dialog: { showOpenDialog: mocks.pick },
  app: {}
}))
vi.mock('../../logger', () => ({ logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }))
vi.mock('../worker-task', () => ({
  runWorkerTask: vi.fn((_file: string, data: { files: FileEntry[]; rules: RenameRule[] }) =>
    Promise.resolve(generatePreviews(data.files, data.rules))
  )
}))
let dir: string
const call = (name: string, ...args: unknown[]) =>
  mocks.handlers.get('file-renamer:' + name)!(null, ...args)
const preview = (name: string, target: string): RenamePreview => ({
  original: name,
  preview: target,
  path: join(dir, name)
})
beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'dev-toolkit-renamer-ipc-'))
  setupFileRenamerIPC()
  mocks.pick.mockResolvedValue({ canceled: false, filePaths: [dir] })
})
afterEach(async () => {
  for (const file of await readdir(dir)) await unlink(join(dir, file))
  await rmdir(dir)
})
describe('rename IPC boundaries', () => {
  it('rejects unselected paths', async () => {
    await writeFile(join(dir, 'a'), 'a')
    expect(await call('execute', [preview('a', 'b')])).toMatchObject([
      { success: false, error: 'unauthorizedPath' }
    ])
    expect(await readFile(join(dir, 'a'), 'utf8')).toBe('a')
  })
  it('checks conflicts again at execution and continues subsequent items', async () => {
    await call('selectFolder')
    await writeFile(join(dir, 'a'), 'a')
    await writeFile(join(dir, 'c'), 'c')
    const pending = [preview('a', 'b'), preview('c', 'd')]
    await writeFile(join(dir, 'b'), 'new file after preview')
    expect(await call('execute', pending)).toMatchObject([
      { success: false, error: 'targetExists' },
      { success: true }
    ])
    expect(await readFile(join(dir, 'b'), 'utf8')).toBe('new file after preview')
    expect(await readFile(join(dir, 'd'), 'utf8')).toBe('c')
  })
  it('does not trust duplicate targets from the renderer', async () => {
    await call('selectFolder')
    await writeFile(join(dir, 'a'), 'a')
    await writeFile(join(dir, 'b'), 'b')
    expect(await call('execute', [preview('a', 'target'), preview('b', 'target')])).toMatchObject([
      { success: true },
      { success: false, error: 'targetExists' }
    ])
    expect(await readFile(join(dir, 'target'), 'utf8')).toBe('a')
    expect(await readFile(join(dir, 'b'), 'utf8')).toBe('b')
  })
  it('undo skips occupied paths and continues', async () => {
    await call('selectFolder')
    for (const name of ['a', 'b', 'd']) await writeFile(join(dir, name), name)
    const result = (await call('undo', [
      { oldPath: join(dir, 'a'), newPath: join(dir, 'b') },
      { oldPath: join(dir, 'c'), newPath: join(dir, 'd') }
    ])) as RenameResult[]
    expect(result).toMatchObject([{ success: false, error: 'targetExists' }, { success: true }])
    expect(await readFile(join(dir, 'a'), 'utf8')).toBe('a')
    expect(await readFile(join(dir, 'c'), 'utf8')).toBe('d')
  })
  it('blocks traversal and returns failed worker previews as conflicts', async () => {
    await call('selectFolder')
    expect(await call('execute', [preview('a', '../escape')])).toMatchObject([
      { error: 'invalidFilename' }
    ])
    vi.mocked(runWorkerTask).mockRejectedValueOnce(new Error('workerTimeout'))
    expect(
      await call(
        'preview',
        [{ name: 'a', path: join(dir, 'a') }],
        [
          {
            type: 'regex',
            pattern: '(a+)+$'
          }
        ]
      )
    ).toMatchObject([{ conflict: 'workerTimeout' }])
  })
  it('marks malformed regex and duplicate previews as conflicts', async () => {
    const files = ['a', 'b'].map(name => ({ name, path: join(dir, name) }))
    expect(await call('preview', files, [{ type: 'regex', pattern: '[' }])).toMatchObject([
      { conflict: 'invalidRegex' },
      { conflict: 'invalidRegex' }
    ])
    expect(
      await call('preview', files, [{ type: 'regex', pattern: '.+', replaceWith: 'same' }])
    ).toMatchObject([{ preview: 'same' }, { conflict: 'duplicateTarget' }])
  })
})
