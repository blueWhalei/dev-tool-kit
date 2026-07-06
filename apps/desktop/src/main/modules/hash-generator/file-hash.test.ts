import { describe, it, expect, afterEach } from 'vitest'
import { mkdtemp, writeFile, rm } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'
import { computeFileHashes, computeFileStreamHash } from './file-hash'
import { computeHash } from '@dev-tool-kit/shared'

describe('computeFileStreamHash', () => {
  let tempDir: string

  afterEach(async () => {
    if (tempDir) await rm(tempDir, { recursive: true, force: true })
  })

  it('hashes file content matching text hashes', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'hash-test-'))
    const filePath = join(tempDir, 'hello.txt')
    await writeFile(filePath, 'hello', 'utf8')

    const md5 = await computeFileStreamHash('md5', filePath)
    const sha256 = await computeFileStreamHash('sha256', filePath)

    expect(md5).toBe(await computeHash('MD5', 'hello'))
    expect(sha256).toBe(await computeHash('SHA-256', 'hello'))
  })

  it('returns file metadata and all algorithms', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'hash-test-'))
    const filePath = join(tempDir, 'sample.bin')
    await writeFile(filePath, Buffer.from([0, 1, 2, 3]))

    const result = await computeFileHashes(filePath)

    expect(result).not.toBeNull()
    expect(result!.fileName).toBe('sample.bin')
    expect(result!.fileSize).toBe(4)
    expect(result!.hashes.map((item) => item.algorithm)).toEqual([
      'MD5',
      'SHA-1',
      'SHA-256',
      'SHA-512'
    ])
    expect(result!.hashes.every((item) => /^[0-9a-f]+$/.test(item.hash))).toBe(true)
  })
})
