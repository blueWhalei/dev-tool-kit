import { createReadStream } from 'fs'
import { stat } from 'fs/promises'
import { createHash } from 'crypto'
import { basename } from 'path'
import type { HashAlgorithm, FileHashResults } from '@dev-tool-kit/shared'

export const NODE_HASH_ALGORITHMS: Record<HashAlgorithm, string> = {
  MD5: 'md5',
  'SHA-1': 'sha1',
  'SHA-256': 'sha256',
  'SHA-512': 'sha512'
}

export const FILE_HASH_ALGORITHMS: HashAlgorithm[] = ['MD5', 'SHA-1', 'SHA-256', 'SHA-512']

export function computeFileStreamHash(nodeAlgorithm: string, filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = createHash(nodeAlgorithm)
    const stream = createReadStream(filePath)
    stream.on('data', (data) => hash.update(data))
    stream.on('end', () => resolve(hash.digest('hex')))
    stream.on('error', reject)
  })
}

export async function computeFileHashes(filePath: string): Promise<FileHashResults | null> {
  if (!filePath.trim()) return null

  const fileStat = await stat(filePath)
  const fileName = basename(filePath)

  const hashes = await Promise.all(
    FILE_HASH_ALGORITHMS.map(async (algorithm) => ({
      algorithm,
      hash: await computeFileStreamHash(NODE_HASH_ALGORITHMS[algorithm], filePath)
    }))
  )

  return { fileName, fileSize: fileStat.size, hashes }
}
