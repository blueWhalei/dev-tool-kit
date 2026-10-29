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
  const schema = await readFile(
    resolve('apps/desktop/src/main/modules/json-schema/schema-worker.ts'),
    'utf8'
  )
  const schemaSource = schema.replace(
    "'@dev-tool-kit/shared'",
    JSON.stringify(createRequire(import.meta.url).resolve('@dev-tool-kit/shared'))
  )
  await writeFile(
    join(dir, 'schema-worker.js'),
    ts.transpileModule(schemaSource, {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
    }).outputText
  )
})
afterAll(async () => {
  for (const file of await readdir(dir)) await unlink(join(dir, file))
  await rmdir(dir)
})
describe('worker lifecycle', () => {
  it('cancels an active worker and rejects already cancelled requests', async () => {
    const controller = new AbortController()
    const pending = runWorkerTask(
      join(dir, 'schema-worker.js'),
      { data: 'a'.repeat(40) + '!', schemaText: '{"type":"string","pattern":"^(a+)+$"}' },
      3000,
      controller.signal
    )
    controller.abort()
    await expect(pending).rejects.toThrow('workerCancelled')
    await expect(
      runWorkerTask(join(dir, 'schema-worker.js'), {}, 3000, controller.signal)
    ).rejects.toThrow('workerCancelled')
  })
  it('validates Schema in isolation and terminates catastrophic pattern evaluation', async () => {
    expect(
      await runWorkerTask(join(dir, 'schema-worker.js'), {
        data: 'ok',
        schemaText: '{"type":"string"}'
      })
    ).toMatchObject({ success: true, valid: true })
    let responsive = false
    const timer = setTimeout(() => {
      responsive = true
    }, 20)
    await expect(
      runWorkerTask(
        join(dir, 'schema-worker.js'),
        { data: 'a'.repeat(40) + '!', schemaText: '{"type":"string","pattern":"^(a+)+$"}' },
        250
      )
    ).rejects.toThrow('workerTimeout')
    clearTimeout(timer)
    expect(responsive).toBe(true)
  })
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
