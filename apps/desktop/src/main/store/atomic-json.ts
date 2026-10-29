import { mkdir, open, readFile, rename, unlink, stat } from 'fs/promises'
import { dirname, resolve } from 'path'
import { randomUUID } from 'crypto'

const queues = new Map<string, Promise<unknown>>()

export function serializeFile<T>(path: string, operation: () => Promise<T>): Promise<T> {
  const key = resolve(path)
  const previous = queues.get(key) ?? Promise.resolve()
  const pending = previous.catch(() => undefined).then(operation)
  queues.set(key, pending)
  void pending
    .finally(() => {
      if (queues.get(key) === pending) queues.delete(key)
    })
    .catch(() => undefined)
  return pending
}

export async function replaceFile(path: string, content: string): Promise<void> {
  await mkdir(dirname(path), { recursive: true })
  const temporary = path + '.' + randomUUID() + '.tmp'
  try {
    let mode = 0o600
    try {
      mode = (await stat(path)).mode & 0o777
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
    }
    const handle = await open(temporary, 'wx', mode)
    try {
      // open() applies umask; restore the original mode before replacing an existing file.
      if (process.platform !== 'win32') await handle.chmod(mode)
      await handle.writeFile(content, 'utf8')
      await handle.sync()
    } finally {
      await handle.close()
    }
    await rename(temporary, path)
  } finally {
    await unlink(temporary).catch(error => {
      if (error.code !== 'ENOENT') throw error
    })
  }
}

export type JsonValidator<T> = (value: unknown) => value is T

export async function readJsonFile<T>(
  path: string,
  fallback: T,
  validate: JsonValidator<T>
): Promise<T> {
  let invalid = false
  for (const candidate of [path, path + '.bak']) {
    try {
      const value: unknown = JSON.parse(await readFile(candidate, 'utf8'))
      if (validate(value)) return value
      invalid = true
    } catch (error) {
      if (!(error instanceof SyntaxError) && (error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error
      }
      if (error instanceof SyntaxError) invalid = true
    }
  }
  if (invalid) throw new Error('invalidConfig')
  return fallback
}

async function writeJsonUnlocked<T>(
  path: string,
  value: T,
  validate: JsonValidator<T>
): Promise<void> {
  if (!validate(value)) throw new Error('invalidConfig')
  const content = JSON.stringify(value, null, 2)
  try {
    const previous = await readFile(path, 'utf8')
    if (!validate(JSON.parse(previous))) throw new SyntaxError('Invalid JSON structure')
    await replaceFile(path + '.bak', previous)
  } catch (error) {
    if (!(error instanceof SyntaxError) && (error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw error
    }
  }
  await replaceFile(path, content)
}

export function writeJsonFile<T>(
  path: string,
  value: T,
  validate: JsonValidator<T>
): Promise<void> {
  // Snapshot at invocation so later mutations cannot change a queued write.
  const snapshot: unknown = JSON.parse(JSON.stringify(value))
  if (!validate(snapshot)) throw new Error('invalidConfig')
  return serializeFile(path, () => writeJsonUnlocked(path, snapshot, validate))
}

export function updateJsonFile<T>(
  path: string,
  fallback: T,
  update: (value: T) => T,
  validate: JsonValidator<T>
): Promise<void> {
  return serializeFile(path, async () => {
    const next = update(await readJsonFile(path, fallback, validate))
    await writeJsonUnlocked(path, next, validate)
  })
}

export function removeJsonFile(path: string): Promise<void> {
  return serializeFile(path, async () => {
    for (const file of [path, path + '.bak']) {
      await unlink(file).catch(error => {
        if (error.code !== 'ENOENT') throw error
      })
    }
  })
}
