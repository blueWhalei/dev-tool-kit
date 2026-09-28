// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mkdtemp, readFile, writeFile, readdir, rmdir, unlink, link, lstat } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'
import { moveWithoutOverwrite, isValidFilename } from './safe-move'

vi.mock('fs/promises', async importOriginal => {
  const actual = await importOriginal<typeof import('fs/promises')>()
  return {
    ...actual,
    link: vi.fn(actual.link),
    unlink: vi.fn(actual.unlink),
    lstat: vi.fn(actual.lstat)
  }
})
const actual = await vi.importActual<typeof import('fs/promises')>('fs/promises')
let dir: string
beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'dev-toolkit-safe-move-'))
})
afterEach(async () => {
  vi.mocked(link).mockImplementation(actual.link)
  vi.mocked(unlink).mockImplementation(actual.unlink)
  vi.mocked(lstat).mockImplementation(actual.lstat)
  for (const file of await readdir(dir)) await actual.unlink(join(dir, file))
  await rmdir(dir)
})
describe('exclusive file moves', () => {
  it('moves and undoes ordinary files without changing contents', async () => {
    const a = join(dir, 'a.txt'),
      b = join(dir, 'b.txt')
    await writeFile(a, 'original')
    expect(await moveWithoutOverwrite(a, b)).toMatchObject({
      success: true,
      oldPath: a,
      newPath: b
    })
    expect(await readFile(b, 'utf8')).toBe('original')
    expect(await moveWithoutOverwrite(b, a)).toMatchObject({ success: true })
    expect(await moveWithoutOverwrite(a, a)).toEqual({
      success: true,
      original: 'a.txt',
      renamed: 'a.txt'
    })
  })
  it('refuses a target created after preview and refuses an occupied undo destination', async () => {
    const a = join(dir, 'a.txt'),
      b = join(dir, 'b.txt')
    await writeFile(a, 'source')
    await writeFile(b, 'target')
    expect(await moveWithoutOverwrite(a, b)).toMatchObject({
      success: false,
      error: 'targetExists'
    })
    expect(await moveWithoutOverwrite(b, a)).toMatchObject({
      success: false,
      error: 'targetExists'
    })
    expect(await readFile(a, 'utf8')).toBe('source')
    expect(await readFile(b, 'utf8')).toBe('target')
  })
  it('allows only one concurrent claimant for a target', async () => {
    const a = join(dir, 'a'),
      b = join(dir, 'b'),
      target = join(dir, 'target')
    await writeFile(a, 'a')
    await writeFile(b, 'b')
    const results = await Promise.all([
      moveWithoutOverwrite(a, target),
      moveWithoutOverwrite(b, target)
    ])
    expect(results.filter(r => r.success)).toHaveLength(1)
    expect(results.filter(r => r.error === 'targetExists')).toHaveLength(1)
    const winner = await readFile(target, 'utf8')
    expect(await readFile(winner === 'a' ? b : a, 'utf8')).toBe(winner === 'a' ? 'b' : 'a')
  })
  it('fails safely when hard links are unsupported', async () => {
    const a = join(dir, 'a'),
      b = join(dir, 'b')
    await writeFile(a, 'source')
    vi.mocked(link).mockRejectedValueOnce(Object.assign(new Error(), { code: 'ENOTSUP' }))
    expect(await moveWithoutOverwrite(a, b)).toMatchObject({
      success: false,
      error: 'safeMoveFailed'
    })
    expect(await readFile(a, 'utf8')).toBe('source')
    await expect(readFile(b)).rejects.toMatchObject({ code: 'ENOENT' })
  })
  it('keeps both paths when source deletion fails', async () => {
    const a = join(dir, 'a'),
      b = join(dir, 'b')
    await writeFile(a, 'source')
    vi.mocked(unlink).mockRejectedValueOnce(Object.assign(new Error(), { code: 'EPERM' }))
    expect(await moveWithoutOverwrite(a, b)).toMatchObject({
      success: false,
      error: 'sourceRemovalFailed'
    })
    expect(await readFile(a, 'utf8')).toBe('source')
    expect(await readFile(b, 'utf8')).toBe('source')
  })
  it('rejects directories and symbolic links', async () => {
    expect(await moveWithoutOverwrite(dir, join(dir, 'target'))).toMatchObject({
      error: 'regularFilesOnly'
    })
    const a = join(dir, 'a')
    await writeFile(a, 'a')
    const info = await actual.lstat(a)
    vi.mocked(lstat).mockResolvedValueOnce(Object.assign(info, { isSymbolicLink: () => true }))
    expect(await moveWithoutOverwrite(a, join(dir, 'target'))).toMatchObject({
      error: 'regularFilesOnly'
    })
  })
  it.each(['../escape', 'a/b', 'a\\b', 'CON.txt', 'x.', 'x ', '', String.fromCharCode(0)])(
    'rejects unsafe filename %s',
    name => {
      expect(isValidFilename(name)).toBe(false)
    }
  )
})
