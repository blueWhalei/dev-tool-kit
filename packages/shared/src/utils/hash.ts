/** SHA digests via Web Crypto (renderer-safe). */
export async function digestSha(
  algorithm: 'SHA-1' | 'SHA-256' | 'SHA-512',
  text: string
): Promise<string> {
  const data = new TextEncoder().encode(text)
  const hashBuffer = await crypto.subtle.digest(algorithm, data)
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

const MD5_S = [
  7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22,
  5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20,
  4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23,
  6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21
]

function leftRotate(value: number, shift: number): number {
  return ((value << shift) | (value >>> (32 - shift))) >>> 0
}

function md5Words(bytes: Uint8Array): number[] {
  const words: number[] = []
  for (let i = 0; i < bytes.length; i += 4) {
    words.push(
      bytes[i] |
      ((bytes[i + 1] ?? 0) << 8) |
      ((bytes[i + 2] ?? 0) << 16) |
      ((bytes[i + 3] ?? 0) << 24)
    )
  }
  return words
}

function md5Block(block: number[], state: number[]): void {
  let [a, b, c, d] = state
  const M = block

  for (let i = 0; i < 64; i++) {
    let f: number
    let g: number
    if (i < 16) {
      f = (b & c) | (~b & d)
      g = i
    } else if (i < 32) {
      f = (d & b) | (~d & c)
      g = (5 * i + 1) % 16
    } else if (i < 48) {
      f = b ^ c ^ d
      g = (3 * i + 5) % 16
    } else {
      f = c ^ (b | ~d)
      g = (7 * i) % 16
    }

    const temp = d
    d = c
    c = b
    const sum = (a + f + M[g] + MD5_K[i]) >>> 0
    b = (b + leftRotate(sum, MD5_S[i])) >>> 0
    a = temp
  }

  state[0] = (state[0] + a) >>> 0
  state[1] = (state[1] + b) >>> 0
  state[2] = (state[2] + c) >>> 0
  state[3] = (state[3] + d) >>> 0
}

const MD5_K: number[] = Array.from({ length: 64 }, (_, i) =>
  Math.floor(Math.abs(Math.sin(i + 1)) * 0x100000000) >>> 0
)

function toHexLE(n: number): string {
  return [n & 0xff, (n >>> 8) & 0xff, (n >>> 16) & 0xff, (n >>> 24) & 0xff]
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

/** MD5 hex digest (UTF-8 input). */
export function md5(text: string): string {
  const input = new TextEncoder().encode(text)
  const bitLen = input.length * 8
  const paddedLen = Math.ceil((input.length + 9) / 64) * 64
  const padded = new Uint8Array(paddedLen)
  padded.set(input)
  padded[input.length] = 0x80
  const view = new DataView(padded.buffer)
  view.setUint32(paddedLen - 8, bitLen >>> 0, true)
  view.setUint32(paddedLen - 4, Math.floor(bitLen / 0x100000000), true)

  const state = [0x67452301, 0xefcdab89, 0x98badcfe, 0x10325476]
  for (let offset = 0; offset < paddedLen; offset += 64) {
    md5Block(md5Words(padded.subarray(offset, offset + 64)), state)
  }

  return state.map(toHexLE).join('')
}

export type HashAlgorithm = 'MD5' | 'SHA-1' | 'SHA-256' | 'SHA-512'

export async function computeHash(algorithm: HashAlgorithm, text: string): Promise<string> {
  if (algorithm === 'MD5') return md5(text)
  return digestSha(algorithm, text)
}

export interface FileHashResult {
  algorithm: HashAlgorithm
  hash: string
}

export interface FileHashResults {
  fileName: string
  fileSize: number
  hashes: FileHashResult[]
}
