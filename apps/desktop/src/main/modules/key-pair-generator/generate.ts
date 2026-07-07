import { generateKeyPairSync } from 'node:crypto'
import type { KeyPairAlgorithm, KeyPairGenerateResult } from '@dev-tool-kit/shared'
import { isKeyPairAlgorithm } from '@dev-tool-kit/shared'

type KeyGenConfig = {
  type: 'rsa' | 'ec'
  options: Record<string, unknown>
  keyType: string
}

const ALGORITHM_CONFIG: Record<KeyPairAlgorithm, KeyGenConfig> = {
  'rsa-2048': { type: 'rsa', options: { modulusLength: 2048 }, keyType: 'RSA 2048' },
  'rsa-4096': { type: 'rsa', options: { modulusLength: 4096 }, keyType: 'RSA 4096' },
  'ec-p256': { type: 'ec', options: { namedCurve: 'prime256v1' }, keyType: 'EC P-256' },
  'ec-p384': { type: 'ec', options: { namedCurve: 'secp384r1' }, keyType: 'EC P-384' }
}

const encoding = {
  publicKeyEncoding: { type: 'spki', format: 'pem' as const },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' as const }
}

type PemKeyPair = { publicKey: string; privateKey: string }

const generatePemKeyPair = generateKeyPairSync as unknown as (
  type: 'rsa' | 'ec',
  options: Record<string, unknown>
) => PemKeyPair

export async function generateKeyPairPem(algorithm: unknown): Promise<KeyPairGenerateResult> {
  if (!isKeyPairAlgorithm(algorithm)) {
    return { success: false, error: 'invalid_algorithm' }
  }

  const config = ALGORITHM_CONFIG[algorithm]

  try {
    const { publicKey, privateKey } = generatePemKeyPair(config.type, {
      ...config.options,
      ...encoding
    })

    return {
      success: true,
      publicKey,
      privateKey,
      algorithm,
      keyType: config.keyType
    }
  } catch {
    return { success: false, error: 'generate_failed' }
  }
}
