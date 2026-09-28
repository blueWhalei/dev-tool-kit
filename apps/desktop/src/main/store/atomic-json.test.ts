import { afterEach, beforeEach, expect, it } from 'vitest'
import { mkdtemp, readFile, writeFile, readdir, unlink, rmdir } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'
import { readJsonFile, writeJsonFile, updateJsonFile, removeJsonFile } from './atomic-json'
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
      updateJsonFile<number[]>(path, [], items => [...items, index])
    )
  )
  expect(await readJsonFile(path, [])).toEqual(Array.from({ length: 20 }, (_, index) => index))
  expect((await readdir(dir)).sort()).toEqual(['state.json', 'state.json.bak'])
})
it('recovers last valid backup when current JSON is truncated', async () => {
  await writeJsonFile(path, { version: 1 })
  await writeJsonFile(path, { version: 2 })
  await writeFile(path, '{')
  expect(await readJsonFile(path, {})).toEqual({ version: 1 })
  await writeJsonFile(path, { version: 3 })
  expect(JSON.parse(await readFile(path + '.bak', 'utf8'))).toEqual({ version: 1 })
})
it('snapshots queued writes and removes backups on reset', async () => {
  const state = { value: 1 }
  const pending = writeJsonFile(path, state)
  state.value = 2
  await pending
  expect(await readJsonFile(path, {})).toEqual({ value: 1 })
  await writeJsonFile(path, state)
  await removeJsonFile(path)
  expect(await readJsonFile(path, {})).toEqual({})
})
it('does not swallow access errors or corrupt the target after serialization failure', async () => {
  await writeJsonFile(path, { valid: true })
  expect(() => writeJsonFile(path, { value: BigInt(1) })).toThrow()
  expect(await readJsonFile(path, {})).toEqual({ valid: true })
})

it('recovers an array backup when the current file has the wrong container type', async () => {
  await writeJsonFile(path, [1])
  await writeJsonFile(path, [2])
  await writeFile(path, '{}')
  expect(await readJsonFile(path, [])).toEqual([1])
  await updateJsonFile<number[]>(path, [], items => [...items, 3])
  expect(await readJsonFile(path, [])).toEqual([1, 3])
  expect(JSON.parse(await readFile(path + '.bak', 'utf8'))).toEqual([1])
})
