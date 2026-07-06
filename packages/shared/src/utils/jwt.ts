import type { ConverterResult } from './converter'

export interface JwtDecodedParts {
  header: Record<string, unknown>
  payload: Record<string, unknown>
  signature: string
}

export interface JwtTimeInfo {
  iat?: number
  exp?: number
  iatDate?: string
  expDate?: string
  isExpired: boolean
  expiresInSeconds?: number
}

export interface JwtVerifyResult {
  valid: boolean
  algorithm: string
}

export const JWT_HMAC_ALGORITHMS = ['HS256', 'HS384', 'HS512'] as const
export type JwtHmacAlgorithm = (typeof JWT_HMAC_ALGORITHMS)[number]

export const JWT_RSA_ALGORITHMS = ['RS256', 'RS384', 'RS512'] as const
export type JwtRsaAlgorithm = (typeof JWT_RSA_ALGORITHMS)[number]

const HMAC_ALGORITHMS: Record<JwtHmacAlgorithm, string> = {
  HS256: 'SHA-256',
  HS384: 'SHA-384',
  HS512: 'SHA-512'
}

const RSA_ALGORITHMS: Record<JwtRsaAlgorithm, string> = {
  RS256: 'SHA-256',
  RS384: 'SHA-384',
  RS512: 'SHA-512'
}

function isHmacAlgorithm(alg: string): alg is JwtHmacAlgorithm {
  return alg in HMAC_ALGORITHMS
}

function isRsaAlgorithm(alg: string): alg is JwtRsaAlgorithm {
  return alg in RSA_ALGORITHMS
}

function fail<T = never>(error: string): ConverterResult<T> {
  return { success: false, error }
}

function base64UrlDecode(str: string): ConverterResult<string> {
  try {
    let base64 = str.replace(/-/g, '+').replace(/_/g, '/')
    const pad = base64.length % 4
    if (pad) base64 += '='.repeat(4 - pad)
    const binary = atob(base64)
    const bytes = Uint8Array.from(binary, char => char.charCodeAt(0))
    return { success: true, result: new TextDecoder().decode(bytes) }
  } catch {
    return fail('无效的 Base64URL 编码')
  }
}

function parseJsonPart(part: string, label: string): ConverterResult<Record<string, unknown>> {
  const decoded = base64UrlDecode(part)
  if (!decoded.success || decoded.result === undefined) {
    return fail(decoded.error ?? `无法解码 JWT ${label}`)
  }
  try {
    const parsed = JSON.parse(decoded.result) as unknown
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      return fail(`JWT ${label} 必须是 JSON 对象`)
    }
    return { success: true, result: parsed as Record<string, unknown> }
  } catch {
    return fail(`JWT ${label} 不是有效的 JSON`)
  }
}

export function decodeJwt(token: string): ConverterResult<JwtDecodedParts> {
  const trimmed = token.trim()
  if (!trimmed) return fail('请输入 JWT Token')

  const parts = trimmed.split('.')
  if (parts.length !== 3) return fail('JWT 格式无效，应包含 header.payload.signature 三部分')

  const [headerPart, payloadPart, signature] = parts
  const headerResult = parseJsonPart(headerPart, 'Header')
  if (!headerResult.success) return fail(headerResult.error!)

  const payloadResult = parseJsonPart(payloadPart, 'Payload')
  if (!payloadResult.success) return fail(payloadResult.error!)

  return {
    success: true,
    result: {
      header: headerResult.result!,
      payload: payloadResult.result!,
      signature
    }
  }
}

export function formatJwtJson(obj: Record<string, unknown>): string {
  return JSON.stringify(obj, null, 2)
}

export function getJwtTimeInfo(payload: Record<string, unknown>): JwtTimeInfo {
  const now = Math.floor(Date.now() / 1000)
  const iat = typeof payload.iat === 'number' ? payload.iat : undefined
  const exp = typeof payload.exp === 'number' ? payload.exp : undefined

  const info: JwtTimeInfo = {
    isExpired: exp !== undefined ? exp < now : false
  }

  if (iat !== undefined) {
    info.iat = iat
    info.iatDate = new Date(iat * 1000).toLocaleString('zh-CN')
  }

  if (exp !== undefined) {
    info.exp = exp
    info.expDate = new Date(exp * 1000).toLocaleString('zh-CN')
    info.expiresInSeconds = exp - now
    info.isExpired = exp < now
  }

  return info
}

async function importHmacKey(secret: string, hash: string): Promise<CryptoKey> {
  const encoder = new TextEncoder()
  return crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash },
    false,
    ['sign']
  )
}

function base64UrlEncodeBytes(bytes: ArrayBuffer): string {
  const binary = String.fromCharCode(...new Uint8Array(bytes))
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function base64UrlEncodeString(str: string): string {
  const bytes = new TextEncoder().encode(str)
  const binary = String.fromCharCode(...bytes)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export function parseJwtPartJson(
  json: string,
  label: string
): ConverterResult<Record<string, unknown>> {
  const trimmed = json.trim()
  if (!trimmed) return fail(`请输入 JWT ${label}`)

  try {
    const parsed = JSON.parse(trimmed) as unknown
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      return fail(`JWT ${label} 必须是 JSON 对象`)
    }
    return { success: true, result: parsed as Record<string, unknown> }
  } catch {
    return fail(`JWT ${label} 不是有效的 JSON`)
  }
}

export async function signJwtHmac(
  header: Record<string, unknown>,
  payload: Record<string, unknown>,
  secret: string,
  algorithm: JwtHmacAlgorithm = 'HS256'
): Promise<ConverterResult<string>> {
  if (!secret.trim()) return fail('请输入 Secret 以签名')

  if (!isHmacAlgorithm(algorithm)) {
    return fail(`不支持的签名算法: ${algorithm}，目前仅支持 HS256/HS384/HS512`)
  }

  const signHeader = { ...header, alg: algorithm }
  const headerPart = base64UrlEncodeString(JSON.stringify(signHeader))
  const payloadPart = base64UrlEncodeString(JSON.stringify(payload))
  const signingInput = `${headerPart}.${payloadPart}`

  try {
    const key = await importHmacKey(secret, HMAC_ALGORITHMS[algorithm])
    const data = new TextEncoder().encode(signingInput)
    const signature = await crypto.subtle.sign('HMAC', key, data)
    const signaturePart = base64UrlEncodeBytes(signature)
    return { success: true, result: `${signingInput}.${signaturePart}` }
  } catch (error) {
    return fail(`签名失败: ${String(error)}`)
  }
}

export async function verifyJwtHmac(
  token: string,
  secret: string
): Promise<ConverterResult<JwtVerifyResult>> {
  if (!secret.trim()) return fail('请输入 Secret 以验签')

  const decoded = decodeJwt(token)
  if (!decoded.success || !decoded.result) return fail(decoded.error!)

  const parts = token.trim().split('.')
  const [headerPart, payloadPart, signaturePart] = parts
  const alg = decoded.result.header.alg

  if (typeof alg !== 'string' || !isHmacAlgorithm(alg)) {
    return fail(`不支持的签名算法: ${String(alg)}，目前仅支持 HS256/HS384/HS512`)
  }

  try {
    const key = await importHmacKey(secret, HMAC_ALGORITHMS[alg])
    const data = new TextEncoder().encode(`${headerPart}.${payloadPart}`)
    const signature = await crypto.subtle.sign('HMAC', key, data)
    const expected = base64UrlEncodeBytes(signature)
    const valid = expected === signaturePart

    return {
      success: true,
      result: { valid, algorithm: alg }
    }
  } catch (error) {
    return fail(`验签失败: ${String(error)}`)
  }
}

function pemToBinary(pem: string): ConverterResult<Uint8Array> {
  const trimmed = pem.trim()
  if (!trimmed.includes('-----BEGIN')) return fail('无效的 PEM 公钥格式')

  const base64 = trimmed
    .replace(/-----BEGIN[^-]+-----/g, '')
    .replace(/-----END[^-]+-----/g, '')
    .replace(/\s/g, '')

  try {
    const binary = atob(base64)
    return { success: true, result: Uint8Array.from(binary, char => char.charCodeAt(0)) }
  } catch {
    return fail('无法解析 PEM Base64 内容')
  }
}

export async function verifyJwtRsa(
  token: string,
  publicKeyPem: string
): Promise<ConverterResult<JwtVerifyResult>> {
  if (!publicKeyPem.trim()) return fail('请输入 RSA 公钥 PEM 以验签')

  const decoded = decodeJwt(token)
  if (!decoded.success || !decoded.result) return fail(decoded.error!)

  const parts = token.trim().split('.')
  const [headerPart, payloadPart, signaturePart] = parts
  const alg = decoded.result.header.alg

  if (typeof alg !== 'string' || !isRsaAlgorithm(alg)) {
    return fail(`不支持的 RSA 算法: ${String(alg)}，目前仅支持 RS256/RS384/RS512`)
  }

  const pemBinary = pemToBinary(publicKeyPem)
  if (!pemBinary.success || !pemBinary.result) return fail(pemBinary.error!)

  try {
    const spki = new Uint8Array(pemBinary.result)
    const key = await crypto.subtle.importKey(
      'spki',
      spki,
      { name: 'RSASSA-PKCS1-v1_5', hash: RSA_ALGORITHMS[alg] },
      false,
      ['verify']
    )

    let sigBase64 = signaturePart.replace(/-/g, '+').replace(/_/g, '/')
    const pad = sigBase64.length % 4
    if (pad) sigBase64 += '='.repeat(4 - pad)
    const sigBinary = atob(sigBase64)
    const signature = Uint8Array.from(sigBinary, char => char.charCodeAt(0))
    const data = new TextEncoder().encode(`${headerPart}.${payloadPart}`)

    const valid = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, signature, data)

    return {
      success: true,
      result: { valid, algorithm: alg }
    }
  } catch (error) {
    return fail(`RSA 验签失败: ${String(error)}`)
  }
}
