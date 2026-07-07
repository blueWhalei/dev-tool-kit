export type KeyPairAlgorithm = 'rsa-2048' | 'rsa-4096' | 'ec-p256' | 'ec-p384'

export interface KeyPairGenerateOptions {
  algorithm: KeyPairAlgorithm
}

export interface KeyPairGenerateSuccess {
  success: true
  publicKey: string
  privateKey: string
  algorithm: KeyPairAlgorithm
  keyType: string
}

export interface KeyPairGenerateFailure {
  success: false
  error: string
}

export type KeyPairGenerateResult = KeyPairGenerateSuccess | KeyPairGenerateFailure

export const KEY_PAIR_ALGORITHMS: KeyPairAlgorithm[] = [
  'rsa-2048',
  'rsa-4096',
  'ec-p256',
  'ec-p384'
]

export function isKeyPairAlgorithm(value: unknown): value is KeyPairAlgorithm {
  return typeof value === 'string' && (KEY_PAIR_ALGORITHMS as readonly string[]).includes(value)
}
