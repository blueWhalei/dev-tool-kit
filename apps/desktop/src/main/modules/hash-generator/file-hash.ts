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

export async function computeFileHashes(filePath: string): Promise<FileHashResults | null> {
  if (!filePath.trim()) return null

  const fileStat = await stat(filePath)
  const fileName = basename(filePath)

  const contexts = FILE_HASH_ALGORITHMS.map(algorithm => ({
    algorithm,
    context: createHash(NODE_HASH_ALGORITHMS[algorithm])
  }))
  for await (const chunk of createReadStream(filePath)) {
    for (const { context } of contexts) context.update(chunk)
  }
  const hashes = contexts.map(({ algorithm, context }) => ({
    algorithm,
    hash: context.digest('hex')
  }))

  return { fileName, fileSize: fileStat.size, hashes }
}
