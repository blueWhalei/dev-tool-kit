import { createRequire } from 'module'
// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { mkdtemp, readFile, writeFile, readdir, unlink, rmdir } from 'fs/promises'
import { join, resolve } from 'path'
import { tmpdir } from 'os'
import ts from 'typescript'
import { runWorkerTask } from './worker-task'
let dir: string
beforeAll(async () => {
  dir = await mkdtemp(join(tmpdir(), 'dev-toolkit-worker-'))
  for (const name of ['rules', 'rename-worker']) {
    const source = await readFile(
      resolve('apps/desktop/src/main/modules/file-renamer', name + '.ts'),
      'utf8'
    )
    const sharedTypes = createRequire(import.meta.url).resolve('@dev-tool-kit/shared/types')
    const isolatedSource = source.replace(
      "'@dev-tool-kit/shared/types'",
      JSON.stringify(sharedTypes)
    )
    const output = ts.transpileModule(isolatedSource, {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
    }).outputText
    await writeFile(join(dir, name + '.js'), output)
  }
  await writeFile(join(dir, 'exit.js'), 'process.exit(0)')
  await writeFile(join(dir, 'error.js'), 'throw new Error("boom")')
})
afterAll(async () => {
  for (const file of await readdir(dir)) await unlink(join(dir, file))
  await rmdir(dir)
})
describe('worker lifecycle', () => {
  const files = [{ name: 'sample.txt', path: '/sample.txt' }]
  it('returns a normal preview from a real worker', async () => {
    await expect(
      runWorkerTask(join(dir, 'rename-worker.js'), {
        files,
        rules: [{ type: 'prefix', value: 'x_' }]
      })
    ).resolves.toMatchObject([{ preview: 'x_sample.txt' }])
  })
  it('terminates catastrophic regex without blocking the main thread', async () => {
    let responsive = false
    const timer = setTimeout(() => {
      responsive = true
    }, 20)
    await expect(
      runWorkerTask(
        join(dir, 'rename-worker.js'),
        {
          files: [{ name: 'a'.repeat(40) + '!.txt', path: '/bad.txt' }],
          rules: [{ type: 'regex', pattern: '(a+)+$' }]
        },
        150
      )
    ).rejects.toThrow('workerTimeout')
    clearTimeout(timer)
    expect(responsive).toBe(true)
  })
  it.each(['exit.js', 'error.js'])('rejects worker failure: %s', async name => {
    await expect(runWorkerTask(join(dir, name), {})).rejects.toThrow('workerFailed')
  })
})
