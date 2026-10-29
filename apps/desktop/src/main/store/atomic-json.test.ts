import { afterEach, beforeEach, expect, it } from 'vitest'
import { mkdtemp, readFile, writeFile, readdir, unlink, rmdir, chmod, stat } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'
import {
  readJsonFile,
  writeJsonFile,
  updateJsonFile,
  removeJsonFile,
  replaceFile
} from './atomic-json'
const numbers = (value: unknown): value is number[] =>
  Array.isArray(value) && value.every(item => typeof item === 'number')
const record = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value)
let dir: string
let path: string
beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'toolkit-json-'))
  path = join(dir, 'state.json')
})
afterEach(async () => {
  for (const name of await readdir(dir)) await unlink(join(dir, name))
  await rmdir(dir)
})
it('serializes concurrent read-modify-write without losing entries', async () => {
  await Promise.all(
    Array.from({ length: 20 }, (_, index) =>
      updateJsonFile<number[]>(path, [], items => [...items, index], numbers)
    )
  )
  expect(await readJsonFile(path, [], numbers)).toEqual(
    Array.from({ length: 20 }, (_, index) => index)
  )
  expect((await readdir(dir)).sort()).toEqual(['state.json', 'state.json.bak'])
})
it('recovers last valid backup when current JSON is truncated', async () => {
  await writeJsonFile(path, { version: 1 }, record)
  await writeJsonFile(path, { version: 2 }, record)
  await writeFile(path, '{')
  expect(await readJsonFile(path, {}, record)).toEqual({ version: 1 })
  await writeJsonFile(path, { version: 3 }, record)
  expect(JSON.parse(await readFile(path + '.bak', 'utf8'))).toEqual({ version: 1 })
})
it('snapshots queued writes and removes backups on reset', async () => {
  const state = { value: 1 }
  const pending = writeJsonFile(path, state, record)
  state.value = 2
  await pending
  expect(await readJsonFile(path, {}, record)).toEqual({ value: 1 })
  await writeJsonFile(path, state, record)
  await removeJsonFile(path)
  expect(await readJsonFile(path, {}, record)).toEqual({})
})
it('does not swallow access errors or corrupt the target after serialization failure', async () => {
  await writeJsonFile(path, { valid: true }, record)
  expect(() => writeJsonFile(path, { value: BigInt(1) }, record)).toThrow()
  expect(await readJsonFile(path, {}, record)).toEqual({ valid: true })
})

it('recovers an array backup when the current file has the wrong container type', async () => {
  await writeJsonFile(path, [1], numbers)
  await writeJsonFile(path, [2], numbers)
  await writeFile(path, '{}')
  expect(await readJsonFile(path, [], numbers)).toEqual([1])
  await updateJsonFile<number[]>(path, [], items => [...items, 3], numbers)
  expect(await readJsonFile(path, [], numbers)).toEqual([1, 3])
  expect(JSON.parse(await readFile(path + '.bak', 'utf8'))).toEqual([1])
})

it('recovers structurally invalid items without overwriting the valid recovery copy', async () => {
  await writeJsonFile(path, [1], numbers)
  await writeJsonFile(path, [2], numbers)
  await writeFile(path, '[null]')
  expect(await readJsonFile(path, [], numbers)).toEqual([1])
  await updateJsonFile(path, [], items => [...items, 3], numbers)
  expect(JSON.parse(await readFile(path + '.bak', 'utf8'))).toEqual([1])
  expect(await readJsonFile(path, [], numbers)).toEqual([1, 3])
})
it('does not turn unrecoverable configuration into an empty collection on update', async () => {
  await writeFile(path, '[null]')
  await writeFile(path + '.bak', '{')
  await expect(updateJsonFile(path, [], items => [...items, 3], numbers)).rejects.toThrow(
    'invalidConfig'
  )
  expect(await readFile(path, 'utf8')).toBe('[null]')
  expect(await readFile(path + '.bak', 'utf8')).toBe('{')
})
it.skipIf(process.platform === 'win32')(
  'preserves an existing mode even when umask removes its group permissions',
  async () => {
    await writeFile(path, 'before')
    await chmod(path, 0o666)
    await replaceFile(path, 'after')
    expect((await stat(path)).mode & 0o777).toBe(0o666)
  }
)
