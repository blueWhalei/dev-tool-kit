import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { mkdtemp, writeFile, readFile, rm, readdir } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'
const mocks = vi.hoisted(() => ({ home: '' }))
vi.mock('os', async importOriginal => ({
  ...(await importOriginal<typeof import('os')>()),
  homedir: () => mocks.home
}))
vi.mock('electron', () => ({ app: { getPath: () => mocks.home } }))
vi.mock('../../logger', () => ({ logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }))
import { setUnixEnv, deleteUnixEnv, restoreUnixBackup } from './unix'
let config: string
beforeEach(async () => {
  mocks.home = await mkdtemp(join(tmpdir(), 'toolkit-shell-test-'))
  config = join(mocks.home, process.platform === 'darwin' ? '.zshrc' : '.bashrc')
  await writeFile(
    config,
    '# preserved\nexport TOOLKIT_TEST_A="old"\nexport TOOLKIT_TEST_A="later"\n'
  )
})
afterEach(async () => {
  delete process.env.TOOLKIT_TEST_A
  delete process.env.TOOLKIT_TEST_B
  await rm(mocks.home, { recursive: true, force: true })
})
it('serializes the entire read-modify-write and preserves both successful updates', async () => {
  expect(
    await Promise.all([setUnixEnv('TOOLKIT_TEST_A', 'a'), setUnixEnv('TOOLKIT_TEST_B', 'b')])
  ).toEqual([{ success: true }, { success: true }])
  const content = await readFile(config, 'utf8')
  expect(content).toContain('# preserved')
  expect(content).toContain('export TOOLKIT_TEST_B="b"')
  expect(content).not.toContain('later')
  expect(content.match(/export TOOLKIT_TEST_A="a"/g)).toHaveLength(2)
  expect((await readdir(join(mocks.home, 'backups/env-shell'))).length).toBeGreaterThan(0)
})
it('rejects invalid backup before any write and removes all duplicate assignments', async () => {
  const before = await readFile(config, 'utf8')
  expect(await restoreUnixBackup([{ name: 'BAD NAME', value: 'x', type: 'user' }])).toMatchObject({
    success: false
  })
  expect(await readFile(config, 'utf8')).toBe(before)
  expect(await deleteUnixEnv('TOOLKIT_TEST_A')).toEqual({ success: true })
  expect(await readFile(config, 'utf8')).not.toContain('TOOLKIT_TEST_A')
})
