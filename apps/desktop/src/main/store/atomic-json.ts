import { mkdir, open, readFile, rename, unlink } from 'fs/promises'
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

async function replaceFile(path: string, content: string): Promise<void> {
  await mkdir(dirname(path), { recursive: true })
  const temporary = path + '.' + randomUUID() + '.tmp'
  try {
    const handle = await open(temporary, 'wx', 0o600)
    try {
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

function sameContainer(value: unknown, reference: unknown): boolean {
  return (
    value !== null &&
    typeof value === typeof reference &&
    Array.isArray(value) === Array.isArray(reference)
  )
}

export async function readJsonFile<T>(path: string, fallback: T): Promise<T> {
  for (const candidate of [path, path + '.bak']) {
    try {
      const value: unknown = JSON.parse(await readFile(candidate, 'utf8'))
      if (sameContainer(value, fallback)) return value as T
    } catch (error) {
      if (!(error instanceof SyntaxError) && (error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error
      }
    }
  }
  return fallback
}

async function writeJsonUnlocked(path: string, value: unknown): Promise<void> {
  const content = JSON.stringify(value, null, 2)
  try {
    const previous = await readFile(path, 'utf8')
    if (!sameContainer(JSON.parse(previous), value)) throw new SyntaxError('Invalid JSON container')
    await replaceFile(path + '.bak', previous)
  } catch (error) {
    if (!(error instanceof SyntaxError) && (error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw error
    }
  }
  await replaceFile(path, content)
}

export function writeJsonFile(path: string, value: unknown): Promise<void> {
  // Snapshot at invocation so later mutations cannot change a queued write.
  const snapshot: unknown = JSON.parse(JSON.stringify(value))
  return serializeFile(path, () => writeJsonUnlocked(path, snapshot))
}

export function updateJsonFile<T>(
  path: string,
  fallback: T,
  update: (value: T) => T
): Promise<void> {
  return serializeFile(path, async () => {
    const next = update(await readJsonFile(path, fallback))
    await writeJsonUnlocked(path, next)
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
