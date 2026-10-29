import { beforeEach, expect, it, vi } from 'vitest'
import { execFileSync } from 'child_process'
const mocks = vi.hoisted(() => ({ execute: vi.fn() }))
vi.mock('util', () => ({ promisify: () => mocks.execute }))
vi.mock('../../logger', () => ({ logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }))
import {
  setWindowsEnv,
  deleteWindowsEnv,
  importWindowsEnv,
  restoreWindowsBackup,
  getRegistryEnv
} from './windows'
beforeEach(() => mocks.execute.mockReset().mockResolvedValue({ stdout: '' }))
it('preserves long, quoted and Unicode values without command interpolation', async () => {
  const value = '中文"$%;'.repeat(700)
  expect(await setWindowsEnv('EXAMPLE', value, 'system')).toEqual({ success: true })
  const [command, args, options] = mocks.execute.mock.calls[0]
  expect(command).toBe('powershell')
  expect(args).not.toContain(value)
  expect(options.env).toMatchObject({
    DVT_ENV_VALUE: value,
    DVT_ENV_SCOPE: 'system',
    DVT_ENV_ACTION: 'set'
  })
  expect(options.windowsHide).toBe(true)
})
it('keeps delete scope and reports insufficient system permissions', async () => {
  mocks.execute.mockRejectedValueOnce(new Error('access denied'))
  expect(await deleteWindowsEnv('PATH', 'system')).toMatchObject({
    success: false,
    error: 'systemWriteFailed'
  })
  expect(mocks.execute.mock.calls[0][2].env.DVT_ENV_SCOPE).toBe('system')
})
it('imports and restores long values through the same complete-value writer', async () => {
  const value = 'x'.repeat(2048)
  expect(await importWindowsEnv('EXAMPLE=' + value)).toEqual([{ name: 'EXAMPLE', success: true }])
  expect(await restoreWindowsBackup([{ name: 'EXAMPLE', value, type: 'user' }])).toEqual({
    success: true
  })
  expect(
    mocks.execute.mock.calls
      .filter(call => call[2].env)
      .every(call => call[2].env.DVT_ENV_VALUE === value)
  ).toBe(true)
})
it('validates the whole import before writing and propagates restore failures', async () => {
  expect(await importWindowsEnv('GOOD=ok\nbad line')).toHaveLength(2)
  expect(mocks.execute).not.toHaveBeenCalled()
  mocks.execute.mockRejectedValueOnce(new Error('write failed'))
  expect(await restoreWindowsBackup([{ name: 'EXAMPLE', value: '', type: 'user' }])).toMatchObject({
    success: false
  })
})
it('preserves registry empty values and whitespace', async () => {
  mocks.execute.mockResolvedValueOnce({
    stdout: JSON.stringify([
      { name: 'EMPTY', value: '', type: 'user' },
      { name: 'SPACES', value: '  x  ', type: 'user' }
    ])
  })
  expect((await getRegistryEnv('user')).map(v => v.value)).toEqual(['', '  x  '])
})
it('broadcasts once for a batch instead of starting a notification process per variable', async () => {
  await importWindowsEnv('FIRST=1\nSECOND=2\nTHIRD=3')
  expect(mocks.execute.mock.calls.filter(call => !call[2].env)).toHaveLength(1)
})
it('restores Windows names and broadcasts successful partial writes when a later write fails', async () => {
  mocks.execute
    .mockResolvedValueOnce({ stdout: '' })
    .mockRejectedValueOnce(new Error('write failed'))
  expect(
    await restoreWindowsBackup([
      { name: 'TOOL(x86)', value: 'C:\\Tools', type: 'user' },
      { name: 'SECOND', value: 'two', type: 'user' }
    ])
  ).toMatchObject({ success: false })
  expect(mocks.execute.mock.calls[0][2].env.DVT_ENV_NAME).toBe('TOOL(x86)')
  expect(mocks.execute.mock.calls.filter(call => !call[2].env)).toHaveLength(1)
})
it.skipIf(process.platform !== 'win32')(
  'parses the actual PowerShell script without executing any registry writes',
  async () => {
    await setWindowsEnv('EXAMPLE', 'value', 'user')
    const encoded = mocks.execute.mock.calls[0][1].at(-1)
    const parser =
      '$tokens=$null; $parseErrors=$null; $source=[Text.Encoding]::Unicode.GetString([Convert]::FromBase64String($env:DVT_TEST_SCRIPT)); [System.Management.Automation.Language.Parser]::ParseInput($source,[ref]$tokens,[ref]$parseErrors) | Out-Null; if ($parseErrors.Count) { $parseErrors | ForEach-Object { Write-Error $_.Message }; exit 1 }'
    expect(() =>
      execFileSync('powershell', ['-NoProfile', '-NonInteractive', '-Command', parser], {
        env: { ...process.env, DVT_TEST_SCRIPT: encoded },
        windowsHide: true,
        timeout: 15000,
        stdio: 'pipe'
      })
    ).not.toThrow()
  }
)
